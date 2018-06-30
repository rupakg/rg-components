/* eslint-disable no-console */

const { google } = require('googleapis')
const googleStorage = require('@google-cloud/storage')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const pack = require('./pack')

const cloudfunctions = google.cloudfunctions('v1')

const getAuthClient = (keyFilename) => {
  const credParts = keyFilename.split(path.sep)

  if (credParts[0] === '~') {
    credParts[0] = os.homedir()
    credentials = credParts.reduce((memo, part) => path.join(memo, part), '')
  }

  const keyFileContent = fs.readFileSync(credentials).toString()
  const key = JSON.parse(keyFileContent)

  return new google.auth
    .JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/cloud-platform'], null)
}

const zipAndUploadSourceCode = async (
  projectId,
  keyFilename,
  sourceCodePath,
  deploymentBucket
) => {
  try {
    const credParts = keyFilename.split(path.sep)
    if (credParts[0] === '~') {
      credParts[0] = os.homedir()
      credentials = credParts.reduce((memo, part) => path.join(memo, part), '')
    }

    const storage = new googleStorage({
      projectId: projectId,
      keyFilename: credentials
    })
    // zip the source code and return archive zip file name and path as an array
    const packRes = await pack(sourceCodePath)

    // create the bucket
    await storage
      .createBucket(deploymentBucket)
      .then(() => {
        // console.log(`Deployment bucket '${deploymentBucket}' created.`)
      })
      .catch(err => {
        console.error('Error in creating deployment bucket: ', err)
      })
    // upload source code zip to bucket
    await storage
      .bucket(deploymentBucket)
      .upload(packRes[1])
      .then(() => {
        // console.log(`Source zip file '${packRes[0]}' uploaded to '${deploymentBucket}'.`)
      })
      .catch(err => {
        console.error('Error in uploading source code archive file: ', err)
      })
    // get object
    await storage
      .bucket(deploymentBucket)
      .file(packRes[0])
      .makePublic()
      .then(() => {
        // console.log(`Public Url: 'gs://${deploymentBucket}/${packRes[0]}'`)
      })
      .catch(err => {
        console.error('Error fetching archive file object url: ', err)
      })
    return `gs://${deploymentBucket}/${packRes[0]}`
  } catch (e) {
    console.error('Error in archiving and uploading source code: ', e)
  }
}

const createFunction = async ({
  name,
  description,
  entryPoint,
  sourceCodePath,
  timeout,
  availableMemoryMb,
  labels,
  sourceArchiveUrl,
  sourceRepository,
  sourceUploadUrl,
  httpsTrigger,
  eventTrigger,
  runtime,
  projectId,
  locationId,
  keyFilename,
  env,
  deploymentBucket
}) => {
  const location = `projects/${projectId}/locations/${locationId}`
  const authClient = getAuthClient(keyFilename)
  if (authClient) {
    const resAuth = await authClient.authorize()
    if (resAuth) {
      try {
        // upload the source code to google storage
        const zipUrl = await zipAndUploadSourceCode(projectId, keyFilename, sourceCodePath, deploymentBucket)
        // Only one of sourceArchiveUrl, sourceRepository or sourceUploadUrl is allowed
        if (!sourceUploadUrl && !sourceRepository) {
          sourceArchiveUrl = zipUrl
        }
        // TODO: Dynamically assign one of: sourceUploadUrl, sourceRepository or sourceArchiveUrl
        // TODO: Dynamically assign one of: httpsTrigger or eventTrigger
        // TODO: Check why 'runtime' does not work. Only the default value of 'nodejs6' works.
        // create the function
        const params = {
          location: location,
          resource: {
            name: `${location}/functions/${name}`,
            description: description,
            entryPoint: entryPoint,
            timeout: timeout,
            availableMemoryMb: availableMemoryMb,
            labels: labels,
            sourceArchiveUrl: sourceArchiveUrl,
            httpsTrigger: {}
            // runtime: runtime
          }
        }
        const requestParams = { auth: authClient, ...params }
        const res = await cloudfunctions.projects.locations.functions.create(requestParams)
        return res
      } catch (e) {
        console.log('Error in creating function: ', e)
      }
    }
  }
}

const getFunction = async (inputs) => {
  // get the newly created function data
  const location = `projects/${inputs.projectId}/locations/${inputs.locationId}`
  try {
    const authClient = getAuthClient(inputs.keyFilename)
    if (authClient) {
      const resAuth = await authClient.authorize()
      if (resAuth) {
        const getParams = {
          name: `${location}/functions/${inputs.name}`
        }
        const requestGetParams = { auth: authClient, ...getParams }
        const res = await cloudfunctions.projects.locations.functions.get(requestGetParams)

        return {
          name: res.data.name,
          sourceArchiveUrl: res.data.sourceArchiveUrl,
          httpsTrigger: res.data.httpsTrigger,
          status: res.data.status,
          entryPoint: res.data.entryPoint,
          timeout: res.data.timeout,
          availableMemoryMb: res.data.availableMemoryMb,
          serviceAccountEmail: res.data.serviceAccountEmail,
          updateTime: res.data.updateTime,
          versionId: res.data.versionId,
          runtime: res.data.runtime
        }
      }
    }
  } catch (e) {
    console.log('Error in fetching function: ', e)
  }
}

const deployFunction = async (inputs) => {
  const location = `projects/${inputs.projectId}/locations/${inputs.locationId}`
  try {
    const resCreate = await createFunction(inputs)
    let resGet = {}
    if (resCreate.status === 200) {
      resGet = await getFunction(inputs)
    }
    return resGet
  } catch (e) {
    console.log('Error in deploying function: ', e)
  }
}

const deploy = async (inputs, context) => {
  let outputs = context.state

  if (!context.state.name && inputs.name) {
    context.log(`Creating Google Cloud Function: '${inputs.name}'.`)
    outputs = await deployFunction(inputs)
  }
  context.saveState({ ...inputs, ...outputs })
  return outputs
}

const info = async (inputs, context) => {
  if (!context.state.name) return {}

  let outputs = context.state

  const location = `projects/${inputs.projectId}/locations/${inputs.locationId}`
  outputs = await getFunction(inputs)
  context.saveState({ ...inputs, ...outputs })

  context.log(`Function url: ${context.state.httpsTrigger.url}`)
}

module.exports = {
  deploy,
  info
}
