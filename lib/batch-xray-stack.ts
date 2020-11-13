import * as cdk from '@aws-cdk/core';
import * as batch from '@aws-cdk/aws-batch';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';

export class BatchXrayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const bucket = new s3.Bucket(this,'Bucket',{
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const jobRole = new iam.Role(this,'JobRole',{
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess')]
    });

    bucket.grantWrite(jobRole);

    const instanceRole = new iam.Role(this,'InstanceRole',{
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess')
      ]
    });

    const instanceProfile = new iam.CfnInstanceProfile(this,'InstanceProfile',{roles:[instanceRole.roleName]})

    const batchVpc = new ec2.Vpc(this, 'VPC'); 

    // Creating a Launch Template that will be used on the compute environment
    const batchTemplate = new ec2.CfnLaunchTemplate(this,'LaunchTemplate',{
      launchTemplateName: `${this.node.uniqueId}LaunchTemplate`,
      launchTemplateData:{
        // Setting the UserData in the Launch Template
        userData: BatchUserData()
      }
    });
    
    const computeEnvironment = new batch.ComputeEnvironment(this,'ComputeEnvironment',{
      managed: true,
      computeResources:{
        minvCpus: 2,
        instanceRole: instanceProfile.attrArn,
        vpc: batchVpc,
        image: ecs.EcsOptimizedImage.amazonLinux(),
        launchTemplate: {
         // passinng the previously created Launch template 
         launchTemplateName: batchTemplate.launchTemplateName as string
        }
      }
    });

    const jobQueue = new batch.JobQueue(this,'JobQueue',{
      computeEnvironments:[{
        computeEnvironment: computeEnvironment,
        order: 1
      }]
    });

    const jobDefinition = new batch.JobDefinition(this, 'BatchJob', {
      container: {
        // todo-list is a directory containing a Dockerfile to build the application
        image: ecs.ContainerImage.fromAsset('./job'),
        environment:{
          AWS_XRAY_SDK_ENABLED: 'true',
          DST_BUCKET: bucket.bucketName,
          IMAGE_URL: 'https://www.python.org/static/img/python-logo@2x.png',
          AWS_DEFAULT_REGION: cdk.Aws.REGION
        },
        jobRole: jobRole,
        vcpus: 1,
        memoryLimitMiB: 1024
      },
      timeout: cdk.Duration.seconds(120)
    });

    new cdk.CfnOutput(this, 'JobQueueArn', {
      value: jobQueue.jobQueueArn,
      description: 'The job queue for the Batch environment',
      exportName: 'JobQueueArn', 
    });

    new cdk.CfnOutput(this, 'JobDefinitionArn', {
      value: jobDefinition.jobDefinitionArn,
      description: 'The job definition with X-Ray configured',
      exportName: 'JobDefinitionArn', 
    });

    new cdk.CfnOutput(this, 'BucketForBatchJob',{
      value: bucket.bucketName,
      description: 'Bucket that Batch Job uploads images',
      exportName: 'BucketForBatchJob'
    });
  
  }
}
// MIME formatted UserData
function BatchUserData(){
  return cdk.Fn.base64(`Content-Type: multipart/mixed; boundary="==XRAYDAEMON=="
MIME-Version: 1.0

--==XRAYDAEMON==
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit

#!/bin/bash

curl https://s3.us-east-2.amazonaws.com/aws-xray-assets.us-east-2/xray-daemon/aws-xray-daemon-3.x.rpm -o /home/ec2-user/xray.rpm
yum install -y /home/ec2-user/xray.rpm
--==XRAYDAEMON==--`);
}