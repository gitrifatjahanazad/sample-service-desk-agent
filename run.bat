docker build . -t helpdesk:latest
docker tag helpdesk:latest us-central1-docker.pkg.dev/applied-abbey-356818/clickspikes/helpdesk:latest
docker push us-central1-docker.pkg.dev/applied-abbey-356818/clickspikes/helpdesk:latest

kubectl apply -f .\kubernetes\secret.yaml

kubectl delete -f .\kubernetes\deployment.yaml
kubectl apply -f .\kubernetes\deployment.yaml
