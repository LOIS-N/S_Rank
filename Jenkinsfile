pipeline {
    agent any

    environment {
        COMPOSE_PATH = '/home/ubuntu/cicd/develop'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
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
            echo 'Dev 배포 성공!'
        }
        failure {
            echo 'Dev 배포 실패!'
        }
    }
}
