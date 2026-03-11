FROM gradle:8.6-jdk17-alpine AS builder
WORKDIR /app
COPY . .
RUN gradle bootJar --no-daemon -x test

FROM openjdk:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]