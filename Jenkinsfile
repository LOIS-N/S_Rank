pipeline {
    agent any

    environment {
        COMPOSE_PATH = '/home/ubuntu/cicd/develop'
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
                curl -X POST -H 'Content-type: application/json' \
                --data '{
                    "text": "### ✅ Dev 배포 성공\\n**push한 사람**: ${env.GITLAB_USER_NAME}\\n**브랜치**: develop\\n[jenkins 로그 확인](${env.BUILD_URL}console)"
                }' \
                ${https://meeting.ssafy.com/hooks/gkjzzhugwfy3jr3fcj4wj9bbkc}
            """
        }
        failure {
            sh """
                curl -X POST -H 'Content-type: application/json' \
                --data '{
                    "text": "### ❌ Dev 배포 실패\\n**push한 사람**: ${env.GITLAB_USER_NAME}\\n**브랜치**: develop\\n[jenkins 로그 확인](${env.BUILD_URL}console)"
                }' \
                ${https://meeting.ssafy.com/hooks/gkjzzhugwfy3jr3fcj4wj9bbkc}
            """
        }
    }

}
