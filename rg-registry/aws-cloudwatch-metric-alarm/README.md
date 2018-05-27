# CloudWatch Metric Alarm component

The component encapsulates the functionality to manage provisioning of a CloudWatch Metric Alarm on the AWS cloud.

<!-- AUTO-GENERATED-CONTENT:START (TOC) -->
- [Parameters](#parameters)
  * [Input Types](#input-types)
  * [Output Types](#output-types)
- [Input Types](#input-types-1)
- [Output Types](#output-types-1)
- [Example](#example)
- [Operations](#operations)
  * [Deploy](#deploy)
  * [Remove](#remove)
  * [Info](#info)
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (COMPONENT_INPUT_TYPES) -->
## Input Types
| Name | Type | Description |
|:------ |:-----|:-----------------|
| **evaluateLowSampleCountPercentile**| `string` | Used only for alarms based on percentiles. Valid values are: [`evaluate`,`ignore`]
| **treatMissingData**| `string` | Sets how this alarm is to handle missing data points. Valid values are: [`breaching`, `notBreaching`, `ignore`, `missing`]
| **datapointsToAlarm**| `int` | The number of datapoints that must be breaching to trigger the alarm.
| **unit**| `string` | The unit of measure for the statistic. Valid values are: [`Seconds`, `Microseconds`, `Milliseconds`, `Bytes`, `Kilobytes`, `Megabytes`, `Gigabytes`, `Terabytes`, `Bits`, `Kilobits`, `Megabits`, `Gigabits`, `Terabits`, `Percent`, `Count`, `Bytes/Second`, `Kilobytes/Second`, `Megabytes/Second`, `Gigabytes/Second`, `Terabytes/Second`, `Bits/Second`, `Kilobits/Second`, `Megabits/Second`, `Gigabits/Second`, `Terabits/Second`, `Count/Second`, `None`]
| **extendedStatistic**| `string` | The percentile statistic for the metric associated with the alarm. Specify a value between p0.0 and p100. Either `statistic` or `extendedStatistic`, but not both.
| **statistic**| `string` | The statistic for the metric associated with the alarm, other than percentile. Valid values are: [`SampleCount`, `Average`, `Sum`, `Minimum`, `Maximum`]. Either `statistic` or `extendedStatistic`, but not both.
| **insufficientDataActions**| `string[]` | The actions to execute when this alarm transitions to the `INSUFFICIENT_DATA` state from any other state. Each action is specified as an Amazon Resource Name (ARN).
| **alarmActions**| `string[]` | The actions to execute when this alarm transitions to the `ALARM` state from any other state. Each action is specified as an Amazon Resource Name (ARN).
| **alarmDescription**| `string` | The description for the alarm.
| **okActions**| `string[]` | The actions to execute when this alarm transitions to an `OK` state from any other state. Each action is specified as an Amazon Resource Name (ARN).
| **actionsEnabled**| `boolean` | Indicates whether actions should be executed during any changes to the alarm state.
| **evaluationPeriods**| `integer`<br/>*required* | The number of periods over which data is compared to the specified threshold.
| **period**| `integer`<br/>*required* | The period, in seconds, over which the specified statistic is applied. Valid values are: [10, 30, and any multiple of 60, max: 86400.]
| **dimensions**| `object[]`<br/>*required* | The dimensions for the metric associated with the alarm.
| **namespace**| `string`<br/>*required* | The namespace for the metric associated with the alarm.
| **metricName**| `string`<br/>*required* | The name for the metric associated with the alarm.
| **threshold**| `number`<br/>*required* | The value against which the specified statistic is compared.
| **comparisonOperator**| `string`<br/>*required* | The arithmetic operation to use when comparing the specified statistic and threshold. Valid values are: [`GreaterThanOrEqualToThreshold`, `GreaterThanThreshold`, `LessThanThreshold`, `LessThanOrEqualToThreshold`]
| **alarmName**| `string`<br/>*required* | The name for the alarm. This name must be unique within the AWS account.

<!-- AUTO-GENERATED-CONTENT:END -->


<!-- AUTO-GENERATED-CONTENT:START (COMPONENT_OUTPUT_TYPES) -->
## Output Types
| Name | Type | Description |
|:------ |:-----|:-----------------|
| **alarmName**| `string` | The name for the alarm. This name must be unique within the AWS account.
| **alarmArn**| `string` | The Amazon Resource Name (ARN) of the alarm.
| **alarmConfigurationUpdatedTimestamp**| `string` | The time stamp of the last update to the alarm configuration.
| **stateValue**| `string` | The state value for the alarm.
| **stateReason**| `string` | An explanation for the alarm state, in text format.
| **stateUpdatedTimestamp**| `string` | The time stamp of the last update to the alarm state.

<!-- AUTO-GENERATED-CONTENT:END -->

## Example

Here is an example of the `aws-cloudwatch-metric-alarm` component being used:

```yaml
type: cw-billing-alarm-app
version: 0.0.1

components:
  billingAlarm:
    type: aws-cloudwatch-metric-alarm
    inputs:
      name: rg-billing-alarm-${self.serviceId}
      description: 'When Estimated Charges > $20'
      comparisonOperator: GreaterThanOrEqualToThreshold
      threshold: 20.0
      metricName: EstimatedCharges
      namespace: AWS/Billing
      dimensions:
        - name: 'Currency'
          value: 'USD'
      period: 28800 # 8 hrs
      evaluationPeriods: 1
      actionsEnabled: true
      alarmActions:
        - arn:aws:sns:us-east-1:xxxxxxxxxx:NotifyMe
      statistic: Maximum
      treatMissingData: missing
```
The above example uses a simple declarative approach by specifying the `inputs` to the component, via the `serverless.yml` file. The example creates an alarm for the `EstimatedCharges` metric under the `AWS/Billing` namespace. When the estimated charges on the AWS account goes higher than $20, an alarm is triggered and based on the specified `alarmActions`, it uses SNS to send an email to the user.

Check out the [full example](https://github.com/rupakg/rg-components/tree/master/rg-examples/cw-billing-alarm-app) for details.

## Operations

The component exposes operations via these commands:

* `deploy`
* `info`
* `remove`

### Deploy

The `deploy` command will create or update an existing CloudWatch Metric Alarm. After the deploy is done, the system automatically calls the `info` command for listing any resources created by the `deploy` command.

```bash
$ components deploy

Creating CloudWatch Metrics Alarm: 'rg-billing-alarm-6d7ycm96j8'
Listing CloudWatch Metrics Alarms...
For metric: 'EstimatedCharges' and namespace: 'AWS/Billing'
-------------------------------------------------------------------------------------
Name: rg-billing-alarm-6d7ycm96j8
Arn: arn:aws:cloudwatch:us-east-1:xxxxxxxxxx:alarm:rg-billing-alarm-6d7ycm96j8
State: INSUFFICIENT_DATA
-------------------------------------------------------------------------------------
```

### Info

The `info` command will list the alarm that was created with the `deploy` command.

```
$ components info

Listing CloudWatch Metrics Alarms...
For metric: 'EstimatedCharges' and namespace: 'AWS/Billing'
-------------------------------------------------------------------------------------
Name: rg-billing-alarm-6d7ycm96j8
Arn: arn:aws:cloudwatch:us-east-1:xxxxxxxxxx:alarm:rg-billing-alarm-6d7ycm96j8
State: ALARM
-------------------------------------------------------------------------------------
```

### Remove

The `remove` command will cleanup and remove any resources deployed with the `deploy` command.

```bash
$ components remove

Removing CloudWatch Metrics Alarm: 'rg-billing-alarm-6d7ycm96j8'
```
