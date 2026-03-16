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
            echo 'Dev 배포 성공!'
        }
        failure {
            echo 'Dev 배포 실패!'
        }
    }
}

}
