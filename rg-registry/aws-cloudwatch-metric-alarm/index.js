/* eslint-disable no-console */

const AWS = require('aws-sdk')

const CloudWatch = new AWS.CloudWatch({ apiVersion: '2010-08-01', region: 'us-east-1' })

// Helper Methods
const camelCaseToCamelCapsArray = (arrCamelCase) => {
  if (arrCamelCase && arrCamelCase.length > 0) {
    arrCamelCase.map((dim) => {
      Object.keys(dim).map((key) => {
        var newkey = key.charAt(0).toUpperCase() + key.substr(1)
        if (!dim[newkey]) {
          dim[newkey] = dim[key]
          delete dim[key]
        }
      })
    })
  }
  return arrCamelCase
}

const putMetricAlarm = async ({
  alarmName,
  alarmDescription,
  comparisonOperator,
  threshold,
  metricName,
  namespace,
  dimensions,
  period,
  evaluationPeriods,
  actionsEnabled,
  okActions,
  alarmActions,
  insufficientDataActions,
  statistic,
  extendedStatistic,
  unit,
  datapointsToAlarm,
  treatMissingData,
  evaluateLowSampleCountPercentile
}) => {
  const putMetricAlarmConfig = {
    AlarmName: alarmName /* required */,
    ComparisonOperator: comparisonOperator /* required */,
    EvaluationPeriods: evaluationPeriods /* required */,
    MetricName: metricName /* required */,
    Namespace: namespace /* required */,
    Period: period /* required */,
    Threshold: threshold /* required */,
    ActionsEnabled: actionsEnabled,
    AlarmActions: alarmActions,
    AlarmDescription: alarmDescription,
    DatapointsToAlarm: datapointsToAlarm,
    Dimensions: camelCaseToCamelCapsArray(dimensions),
    EvaluateLowSampleCountPercentile: evaluateLowSampleCountPercentile,
    ExtendedStatistic: extendedStatistic,
    InsufficientDataActions: insufficientDataActions,
    OKActions: okActions,
    Statistic: statistic,
    TreatMissingData: treatMissingData,
    Unit: unit
  }

  await CloudWatch.putMetricAlarm(putMetricAlarmConfig).promise()

  return {}
}

const deleteAlarm = async (alarmName) => {
  await CloudWatch.deleteAlarms({
    AlarmNames: [alarmName]
  }).promise()

  return {}
}

const describeAlarmsForMetric = async ({
  alarmName,
  metricName,
  namespace,
  dimensions,
  period,
  statistic,
  extendedStatistic,
  unit
}) => {
  const descMetricAlarmConfig = {
    MetricName: metricName /* required */,
    Namespace: namespace /* required */,
    Period: period,
    Dimensions: camelCaseToCamelCapsArray(dimensions),
    ExtendedStatistic: extendedStatistic,
    Statistic: statistic,
    Unit: unit
  }
  const alarmRes = await CloudWatch.describeAlarmsForMetric(descMetricAlarmConfig).promise()

  // filter out outputs for our alarm
  const alarmOutputs = alarmRes.MetricAlarms.filter((alarm) => alarmName === alarm.AlarmName)[0]
  const outputs = {
    alarm: {
      alarmName: alarmOutputs.AlarmName,
      alarmArn: alarmOutputs.AlarmArn,
      alarmConfigurationUpdatedTimestamp: alarmOutputs.AlarmConfigurationUpdatedTimestamp,
      stateValue: alarmOutputs.StateValue,
      stateReason: alarmOutputs.StateReason,
      stateUpdatedTimestamp: alarmOutputs.StateUpdatedTimestamp
    }
  }
  return outputs
}

const deploy = async (inputs, context) => {
  let outputs = context.state

  if (!context.state.alarmName && inputs.alarmName) {
    context.log(`Creating CloudWatch Metrics Alarm: '${inputs.alarmName}'`)
    await putMetricAlarm(inputs)
    outputs = await describeAlarmsForMetric(inputs)
  }
  context.saveState({ ...inputs, ...outputs })
  return outputs
}

const remove = async (inputs, context) => {
  if (!context.state.alarmName) return {}

  try {
    context.log(`Removing CloudWatch Metrics Alarm: '${context.state.alarmName}'`)
    await deleteAlarm(context.state.alarmName)
  } catch (e) {
    if (!e.message.includes('Invalid Metric Alarm name specified')) {
      throw new Error(e)
    }
  }

  context.saveState()
  return {}
}

const info = async (inputs, context) => {
  if (!context.state.alarmName) return {}

  let outputs = context.state

  outputs = await describeAlarmsForMetric(inputs)
  context.saveState({ ...inputs, ...outputs })

  context.log(`Listing CloudWatch Metrics Alarm for '${context.state.alarmName}'`)
  console.log(
    '-------------------------------------------------------------------------------------'
  )
  console.log(`Metric Name: ${context.state.metricName}`)
  console.log(`Namespace: ${context.state.namespace}`)
  console.log(`Alarm Name: ${outputs.alarm.alarmName}`)
  console.log(`Alarm Arn: ${outputs.alarm.alarmArn}`)
  console.log(`Alarm State: ${outputs.alarm.stateValue}`)
  console.log(
    '-------------------------------------------------------------------------------------'
  )

  return outputs
}

module.exports = {
  deploy,
  remove,
  info
}
