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

const zipAndUploadSourceCode = async (projectId, keyFilename, sourceCodePath, deploymentBucket) => {
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
        console.log(`Deployment bucket '${deploymentBucket}' created.`)
      })
      .catch(err => {
        console.error('Error creating deployment bucket: ', err)
      })
    // upload source code zip to bucket
    await storage
      .bucket(deploymentBucket)
      .upload(packRes[1])
      .then(() => {
        console.log(`Source zip file '${packRes[0]}' uploaded to '${deploymentBucket}'.`);
      })
      .catch(err => {
        console.error('Error uploading source zip file:', err);
      })
    // get object
    await storage
      .bucket(deploymentBucket)
      .file(packRes[0])
      .makePublic()
      .then(() => {
        console.log(`Public Url: 'gs://${deploymentBucket}/${packRes[0]}'`)
      })
      .catch(err => {
        console.error('Error fetching archive file object: ', err);
      })
    return `gs://${deploymentBucket}/${packRes[0]}`
    // return `http://storage.googleapis.com/${deploymentBucket}/${packRes[0]}`
  } catch (e) {
    console.error('Error in zipAndUploadSourceCode: ', e)
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
      let resCreate
      try {
        // upload the source code to google storage
        const zipUrl = await zipAndUploadSourceCode(projectId, keyFilename, sourceCodePath, deploymentBucket)
        // Only one of sourceArchiveUrl, sourceRepository or sourceUploadUrl is allowed
        if (!sourceUploadUrl && !sourceRepository) {
          sourceArchiveUrl = zipUrl
        }
        // TODO: Dynamically assign one of: sourceUploadUrl, sourceRepository or sourceArchiveUrl
        // TODO: Dynamically assign one of: httpsTrigger or eventTrigger
        // TODO: Check why 'runtime' does not work. Only the default baue of 'nodejs6' works.
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
            httpsTrigger: {},
            // runtime: runtime
          }
        }
        const requestParams = { auth: authClient, ...params }
        resCreate = await cloudfunctions.projects.locations.functions.create(requestParams)
        // console.log('Create function data: ', resCreate)
      } catch (e) {
        console.log('Error in creating function: ', e)
      }
      if (resCreate.status === 200) {
        // get the newly created function data
        try {
          const getParams = {
            name: `${location}/functions/${name}`
          }
          const requestGetParams = { auth: authClient, ...getParams }
          const res = await cloudfunctions.projects.locations.functions.get(requestGetParams)
          // console.log('Get function data: ', res.data)

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
        } catch (e) {
          console.log('Error in fetching function: ', e)
        }
      }
    }
  }
}

const deploy = async (inputs, context) => {
  let outputs = context.state

  if (!context.state.name && inputs.name) {
    context.log(`Creating Google Cloud Function: '${inputs.name}'`)
    outputs = await createFunction(inputs)
  }
  context.saveState({ ...inputs, ...outputs })
  return outputs
}

module.exports = {
  deploy
}
