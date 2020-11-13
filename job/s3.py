import string
import random
import os
import boto3
import platform
import requests
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch
from log import Logger

def id_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

# configuring xray_recorder
xray_recorder.configure(
    plugins=['EC2Plugin']
)
libraries = (['boto3','requests'])
patch(libraries)


s3 = boto3.client('s3')
sns = boto3.client('sns')
url = os.getenv('IMAGE_URL','https://www.python.org/static/img/python-logo@2x.png')
bucket = os.getenv('DST_BUCKET','1233343-src')
key = 'upload.png'

LOGGER = Logger()

if __name__ == '__main__':

    # Start a segment if no segment exist
    LOGGER.info('starting segment.')
    segment = xray_recorder.begin_segment('BatchJob')

    # This will add the key value pair to segment as it is active
    LOGGER.info('adding annotation to segment.')
    xray_recorder.put_annotation('XRayOnBatch', 'What sourcery is this?')

    # This will add the key value pair to subsegment as it is activeimport platform
    xray_recorder.put_metadata('Python Run-Time', platform.python_version())

    if xray_recorder.is_sampled():
        LOGGER.info('segment was sampled.')
        xray_recorder.put_annotation('job_id', os.getenv('AWS_BATCH_JOB_ID'))

    object_key = f"{id_generator()}.png"

    LOGGER.info(f"downloading picture from {url}")
    downloaded_file = requests.get(url)

    LOGGER.info(f"Uploading {object_key} to bucket: {bucket}")
    s3.put_object(Body=downloaded_file.content, Bucket=bucket, Key=object_key)

    xray_recorder.end_segment()