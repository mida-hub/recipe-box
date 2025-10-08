# recipe-memo
## Artifact Registry
```sh
$ gcloud artifacts repositories \
create recipe-box-repo \
--repository-format=docker \
--location=asia-northeast1 \
--description="Recipe Box container repository"
```
