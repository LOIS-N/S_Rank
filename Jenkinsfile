    agent any

    environment {
        COMPOSE_PATH = '/home/ubuntu/cicd/release'
        MATTERMOST_WEBHOOK = 'https://meeting.ssafy.com/hooks/7pk8t938s7bszxc9acbwfdji9c'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM',
                    branches: [[name: '*/master']],
                    userRemoteConfigs: [[
                        refspec: '+refs/heads/master:refs/remotes/origin/master',
                        url: 'https://lab.ssafy.com/s14-blochain-sub1/S14P21E204.git',
                        credentialsId: 'gitlab-token'
                    ]]
                ])
            }
        }


    post {
        success {
            sh """
                PUSHER=\$(git log -1 --pretty=format:'%an' 2>/dev/null || echo '알 수 없음')
                curl -X POST -H 'Content-type: application/json' \\
                --data "{
                    \\"text\\": \\"### ✅ Prod 배포 성공\\n| 항목 | 내용 |\\n|---|---|\\n| Push한 사람 | \$PUSHER |\\n| 브랜치 | master |\\n| 빌드 번호 | #${BUILD_NUMBER} |\\n| 소요 시간 | ${currentBuild.durationString} |\\n| 로그 | ${BUILD_URL} |\\"
                }" \\
                ${MATTERMOST_WEBHOOK}
            """
        }
        failure {
            sh """
                PUSHER=\$(git log -1 --pretty=format:'%an' 2>/dev/null || echo '알 수 없음')
                curl -X POST -H 'Content-type: application/json' \\
                --data "{
                    \\"text\\": \\"### ❌ Prod 배포 실패\\n| 항목 | 내용 |\\n|---|---|\\n| Push한 사람 | \$PUSHER |\\n| 브랜치 | master |\\n| 빌드 번호 | #${BUILD_NUMBER} |\\n| 확인 | ${BUILD_URL} |\\"
                }" \\
                ${MATTERMOST_WEBHOOK}
            """
        }
    }
}
