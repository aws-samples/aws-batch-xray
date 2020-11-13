FROM centos/python-36-centos7

COPY ./ /var/app/
WORKDIR /var/app
RUN ["pip", "install", "-r","requirements.txt"]
ENTRYPOINT [ "python", "s3.py" ]
