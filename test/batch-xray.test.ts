import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as BatchXray from '../lib/batch-xray-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new BatchXray.BatchXrayStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
