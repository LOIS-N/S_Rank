package com.ssafy.srank.ranking.batch;

import com.sun.management.OperatingSystemMXBean;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.LongTaskTimer;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PreDestroy;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.ExitStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobExecutionListener;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.StepExecution;
import org.springframework.batch.core.StepExecutionListener;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

@Component
public class RankingBatchMetrics {

    private static final String JOB_NAME = RankingBatchConfig.RANKING_SNAPSHOT_JOB;
    private static final String STEP_START_NANOS_KEY = "ranking.batch.metrics.step.startNanos";

    private final MeterRegistry meterRegistry;
    private final MemoryMXBean memoryMxBean = ManagementFactory.getMemoryMXBean();
    private final OperatingSystemMXBean operatingSystemMxBean =
            ManagementFactory.getPlatformMXBean(OperatingSystemMXBean.class);
    private final ScheduledExecutorService samplerExecutor;

    private final AtomicInteger activeJobs = new AtomicInteger();
    private final AtomicLong lastDurationMs = new AtomicLong();
    private final AtomicLong lastCpuTimeMs = new AtomicLong();
    private final AtomicLong lastHeapDeltaBytes = new AtomicLong();
    private final AtomicLong lastPeakHeapBytes = new AtomicLong();
    private final Map<Long, JobRunContext> jobContexts = new ConcurrentHashMap<>();

    public RankingBatchMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.samplerExecutor = Executors.newSingleThreadScheduledExecutor(new MetricsThreadFactory());

        // 가장 최근 배치의 비용을 바로 확인할 수 있도록 last-run 게이지를 유지한다.
        Gauge.builder("ranking.batch.active.jobs", activeJobs, AtomicInteger::get)
                .description("Number of ranking batch jobs currently running")
                .register(meterRegistry);
        Gauge.builder("ranking.batch.last.duration", lastDurationMs, AtomicLong::get)
                .baseUnit("milliseconds")
                .description("Duration of the most recent ranking batch job")
                .register(meterRegistry);
        Gauge.builder("ranking.batch.last.cpu.time", lastCpuTimeMs, AtomicLong::get)
                .baseUnit("milliseconds")
                .description("Process CPU time consumed by the most recent ranking batch job")
                .register(meterRegistry);
        Gauge.builder("ranking.batch.last.heap.delta", lastHeapDeltaBytes, AtomicLong::get)
                .baseUnit("bytes")
                .description("Heap usage delta between start and end of the most recent ranking batch job")
                .register(meterRegistry);
        Gauge.builder("ranking.batch.last.peak.heap", lastPeakHeapBytes, AtomicLong::get)
                .baseUnit("bytes")
                .description("Peak heap usage observed while the most recent ranking batch job was running")
                .register(meterRegistry);
    }

    public JobExecutionListener jobExecutionListener() {
        return new JobMetricsListener();
    }

    public StepExecutionListener stepExecutionListener() {
        return new StepMetricsListener();
    }

    public void recordSnapshotSize(String rankingType, int snapshotCount) {
        DistributionSummary.builder("ranking.batch.snapshot.size")
                .baseUnit("rows")
                .description("Number of rows written to a ranking snapshot")
                .tags("job", JOB_NAME, "ranking_type", rankingType)
                .register(meterRegistry)
                .record(snapshotCount);
    }

    public <T> T recordPhase(String rankingType, String phase, Supplier<T> supplier) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            T result = supplier.get();
            sample.stop(phaseTimer(rankingType, phase, "success"));
            return result;
        } catch (RuntimeException exception) {
            sample.stop(phaseTimer(rankingType, phase, "failure"));
            throw exception;
        }
    }

    public void recordPhaseAction(String rankingType, String phase, Runnable action) {
        recordPhase(rankingType, phase, () -> {
            action.run();
            return null;
        });
    }

    @PreDestroy
    void shutdownSampler() {
        samplerExecutor.shutdownNow();
    }

    private Timer phaseTimer(String rankingType, String phase, String status) {
        return Timer.builder("ranking.batch.phase.duration")
                .description("Execution time of ranking batch phases")
                .tags("job", JOB_NAME, "ranking_type", rankingType, "phase", phase, "status", status)
                .register(meterRegistry);
    }

    private Timer stepTimer(String stepName, String status) {
        return Timer.builder("ranking.batch.step.duration")
                .description("Execution time of ranking batch steps")
                .tags("job", JOB_NAME, "step", stepName, "status", status)
                .register(meterRegistry);
    }

    private Timer jobTimer(String trigger, String status) {
        return Timer.builder("ranking.batch.job.duration")
                .description("Execution time of ranking batch jobs")
                .tags("job", JOB_NAME, "trigger", trigger, "status", status)
                .register(meterRegistry);
    }

    private DistributionSummary cpuTimeSummary(String trigger, String status) {
        return DistributionSummary.builder("ranking.batch.job.cpu.time")
                .baseUnit("milliseconds")
                .description("Process CPU time consumed while a ranking batch job runs")
                .tags("job", JOB_NAME, "trigger", trigger, "status", status)
                .register(meterRegistry);
    }

    private DistributionSummary peakHeapSummary(String trigger, String status) {
        return DistributionSummary.builder("ranking.batch.job.peak.heap")
                .baseUnit("bytes")
                .description("Peak heap usage observed while a ranking batch job runs")
                .tags("job", JOB_NAME, "trigger", trigger, "status", status)
                .register(meterRegistry);
    }

    private long currentHeapUsedBytes() {
        return memoryMxBean.getHeapMemoryUsage().getUsed();
    }

    private long currentProcessCpuTimeNanos() {
        if (operatingSystemMxBean == null) {
            return -1L;
        }
        return operatingSystemMxBean.getProcessCpuTime();
    }

    private String resolveTrigger(JobParameters jobParameters) {
        String trigger = jobParameters.getString("trigger");
        return StringUtils.hasText(trigger) ? trigger : "manual";
    }

    private String normalizeStatus(BatchStatus batchStatus) {
        if (batchStatus == null) {
            return "unknown";
        }
        return batchStatus.name().toLowerCase(Locale.ROOT);
    }

    private long executionKey(JobExecution jobExecution) {
        Long executionId = jobExecution.getId();
        if (executionId != null) {
            return executionId;
        }
        return System.identityHashCode(jobExecution);
    }

    private final class JobMetricsListener implements JobExecutionListener {

        @Override
        public void beforeJob(JobExecution jobExecution) {
            long startHeap = currentHeapUsedBytes();
            AtomicLong peakHeap = new AtomicLong(startHeap);

            // 종료 시점 메모리만 보면 최고 사용량을 놓칠 수 있어 실행 중 heap을 주기적으로 샘플링한다.
            ScheduledFuture<?> sampler = samplerExecutor.scheduleAtFixedRate(
                    () -> peakHeap.accumulateAndGet(currentHeapUsedBytes(), Math::max),
                    0L,
                    1L,
                    TimeUnit.SECONDS
            );

            JobRunContext context = new JobRunContext(
                    System.nanoTime(),
                    currentProcessCpuTimeNanos(),
                    startHeap,
                    peakHeap,
                    LongTaskTimer.builder("ranking.batch.job.active.duration")
                            .description("Active duration of in-flight ranking batch jobs")
                            .tags("job", JOB_NAME, "trigger", resolveTrigger(jobExecution.getJobParameters()))
                            .register(meterRegistry)
                            .start(),
                    sampler
            );

            jobContexts.put(executionKey(jobExecution), context);
            activeJobs.incrementAndGet();
        }

        @Override
        public void afterJob(JobExecution jobExecution) {
            JobRunContext context = jobContexts.remove(executionKey(jobExecution));
            if (context == null) {
                return;
            }

            context.longTaskSample.stop();
            context.sampler.cancel(true);
            activeJobs.decrementAndGet();

            String trigger = resolveTrigger(jobExecution.getJobParameters());
            String status = normalizeStatus(jobExecution.getStatus());
            long durationNanos = System.nanoTime() - context.startNanos;
            long endHeap = currentHeapUsedBytes();

            // heap delta는 시작/종료 차이를 보고, peak heap은 실행 중 가장 높은 메모리 압박을 보여준다.
            long heapDeltaBytes = endHeap - context.startHeapBytes;
            long peakHeapBytes = context.peakHeapBytes.get();
            long currentCpuTimeNanos = currentProcessCpuTimeNanos();
            long cpuDeltaNanos = currentCpuTimeNanos >= 0L && context.startCpuTimeNanos >= 0L
                    ? currentCpuTimeNanos - context.startCpuTimeNanos
                    : -1L;
            long cpuDeltaMs = cpuDeltaNanos >= 0L ? TimeUnit.NANOSECONDS.toMillis(cpuDeltaNanos) : -1L;

            lastDurationMs.set(TimeUnit.NANOSECONDS.toMillis(durationNanos));
            lastHeapDeltaBytes.set(heapDeltaBytes);
            lastPeakHeapBytes.set(peakHeapBytes);
            if (cpuDeltaMs >= 0L) {
                lastCpuTimeMs.set(cpuDeltaMs);
            }

            jobTimer(trigger, status).record(durationNanos, TimeUnit.NANOSECONDS);
            peakHeapSummary(trigger, status).record(peakHeapBytes);
            if (cpuDeltaMs >= 0L) {
                cpuTimeSummary(trigger, status).record(cpuDeltaMs);
            }
        }
    }

    private final class StepMetricsListener implements StepExecutionListener {

        @Override
        public void beforeStep(StepExecution stepExecution) {
            // query/delete/save 구간은 service에서 따로 재므로 여기서는 step 전체 시간만 기록한다.
            stepExecution.getExecutionContext().putLong(STEP_START_NANOS_KEY, System.nanoTime());
        }

        @Override
        public ExitStatus afterStep(StepExecution stepExecution) {
            long startNanos = stepExecution.getExecutionContext().getLong(STEP_START_NANOS_KEY, -1L);
            if (startNanos >= 0L) {
                long durationNanos = System.nanoTime() - startNanos;
                stepTimer(stepExecution.getStepName(), normalizeStatus(stepExecution.getStatus()))
                        .record(durationNanos, TimeUnit.NANOSECONDS);
            }
            return stepExecution.getExitStatus();
        }
    }

    private record JobRunContext(
            long startNanos,
            long startCpuTimeNanos,
            long startHeapBytes,
            AtomicLong peakHeapBytes,
            LongTaskTimer.Sample longTaskSample,
            ScheduledFuture<?> sampler
    ) {
    }

    private static final class MetricsThreadFactory implements ThreadFactory {

        @Override
        public Thread newThread(Runnable runnable) {
            Thread thread = new Thread(runnable, "ranking-batch-metrics-sampler");
            thread.setDaemon(true);
            return thread;
        }
    }
}
