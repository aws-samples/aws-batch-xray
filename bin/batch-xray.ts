#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BatchXrayStack } from '../lib/batch-xray-stack';

const app = new cdk.App();
new BatchXrayStack(app, 'BatchXrayStack');
