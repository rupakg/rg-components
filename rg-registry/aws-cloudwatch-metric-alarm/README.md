# CloudWatch Metric Alarm component

The component encapsulates the functionality to manage provisioning of a CloudWatch Metric Alarm on the AWS cloud.

## Parameters

### Input Types

### Output Types

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

Check out the [full example](../../../examples/billing-alarm) for details.

## Operations

The component exposes operations via these commands:

* `deploy`
* `remove`
* `info`

### Deploy

The `deploy` command will create or update an existing CloudWatch Metric Alarm. After the deploy is done, the system automatically calls the `info` command for listing any resources created by the `deploy` command.

```bash
$ components deploy

Creating CloudWatch Metrics Alarm: 'rg-billing-alarm-6d7ycm96j8'
Listing CloudWatch Metrics Alarms...
For metric: 'EstimatedCharges' and namespace: 'AWS/Billing'
-------------------------------------------------------------------------------------
Name: rg-billing-alarm-6d7ycm96j8
Arn: arn:aws:cloudwatch:us-east-1:063733696545:alarm:rg-billing-alarm-6d7ycm96j8
State: INSUFFICIENT_DATA
-------------------------------------------------------------------------------------
```

### Remove

The `remove` command will cleanup and remove any resources deployed with the `deploy` command.

```bash
$ components remove

Removing CloudWatch Metrics Alarm: 'rg-billing-alarm-6d7ycm96j8'
```

### Info

The `info` command will list the alarm that was created with the `deploy` command.

```
$ components info

Listing CloudWatch Metrics Alarms...
For metric: 'EstimatedCharges' and namespace: 'AWS/Billing'
-------------------------------------------------------------------------------------
Name: rg-billing-alarm-6d7ycm96j8
Arn: arn:aws:cloudwatch:us-east-1:063733696545:alarm:rg-billing-alarm-6d7ycm96j8
State: ALARM
-------------------------------------------------------------------------------------
```
