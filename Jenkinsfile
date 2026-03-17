pipeline {
    agent any

    environment {
        COMPOSE_PATH = '/home/ubuntu/cicd/develop'
        MATTERMOST_WEBHOOK = 'https://meeting.ssafy.com/hooks/7pk8t938s7bszxc9acbwfdji9c'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM',
                    branches: [[name: '*/develop']],
                    userRemoteConfigs: [[
                        refspec: '+refs/heads/develop:refs/remotes/origin/develop',
                        url: 'https://lab.ssafy.com/s14-blochain-sub1/S14P21E204.git',
                        credentialsId: 'gitlab-token'
                    ]]
                ])
            }
        }

        stage('Build') {
            steps {
                sh """
                    cd ${COMPOSE_PATH}
                    docker compose build
                """
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    cd ${COMPOSE_PATH}
                    docker compose down --remove-orphans || true
                    docker compose up -d
                    docker image prune -f
                """
            }
        }
    }

    post {
        success {
            sh """
                PUSHER=\${GITLAB_USER_NAME:-수동 배포}
                curl -X POST -H 'Content-type: application/json' \
                --data "{
                    \\"text\\": \\"---\\\\n### ✅ Dev 배포 성공\\\\n| 항목 | 내용 |\\\\n|------|------|\\\\n| push한 사람 | \$PUSHER |\\\\n| 브랜치 | develop |\\\\n\\\\n📋 [Jenkins 로그 확인](${env.BUILD_URL}console)\\"
                }" \
                ${MATTERMOST_WEBHOOK}
            """
        }
        failure {
            sh """
                PUSHER=\${GITLAB_USER_NAME:-수동 배포}
                curl -X POST -H 'Content-type: application/json' \
                --data "{
                    \\"text\\": \\"---\\\\n### ❌ Dev 배포 실패\\\\n| 항목 | 내용 |\\\\n|------|------|\\\\n| push한 사람 | \$PUSHER |\\\\n| 브랜치 | develop |\\\\n\\\\n📋 [Jenkins 로그 확인](${env.BUILD_URL}console)\\"
                }" \
                ${MATTERMOST_WEBHOOK}
            """
        }
    }

}
