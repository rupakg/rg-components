/* eslint-disable no-console */

const { google } = require('googleapis')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const pack = require('./pack')

const cloudfunctions = google.cloudfunctions('v1')

const getAuthClient = (keyFilename) => {
  const credParts = keyFilename.split(path.sep)

  if (credParts[0] === '~') {
    credParts[0] = os.homedir();
    credentials = credParts.reduce((memo, part) => path.join(memo, part), '')
  }

  const keyFileContent = fs.readFileSync(credentials).toString()
  const key = JSON.parse(keyFileContent)

  return new google.auth
    .JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/cloud-platform'], null)
}

const generateUploadUrl = async (keyFilename, sourceCodePath, location) => {
  try {
    const authClient = getAuthClient(keyFilename)
    if (authClient) {
      const resAuth = await authClient.authorize()
      if (resAuth) {
        const pkg = await pack(sourceCodePath)
        const requestParams = { auth: authClient, parent: location }
        const res = await cloudfunctions.projects.locations.functions.generateUploadUrl(requestParams)
        return res.data.uploadUrl
      }
    }
  } catch (e) {
    console.log(`Error in generateUploadUrl: ${e}`)
  }
}

// const createFunction = async ({
//   name,
//   description,
//   entryPoint,
//   sourceCodePath,
//   timeout,
//   availableMemoryMb,
//   labels,
//   sourceArchiveUrl,
//   sourceRepository,
//   sourceUploadUrl,
//   httpsTrigger,
//   eventTrigger,
//   runtime,
//   projectId,
//   locationId,
//   keyFilename,
//   env
// }) => {
//   try {
//     const authClient = getAuthClient(keyFilename)
//     if (authClient) {
//       const resAuth = await authClient.authorize()
//       if (resAuth) {
//         const params = {
//           name: name,
//           description: description,
//           entryPoint: entryPoint,
//           timeout: timeout,
//           availableMemoryMb: availableMemoryMb,
//           labels: labels,
//           sourceArchiveUrl:
//           location: `projects/${projectId}/locations/${locationId}`
//         }
//         const requestParams = { auth: authClient, ...params }
//         const res = await cloudfunctions.projects.locations.functions.create(requestParams).promise()
//         console.log(`Result is ${res}`)
//         return res
//       }
//     }
//   } catch (e) {
//     console.log(`Error: ${e}`)
//   }
// }

const deploy = async (inputs, context) => {
  let outputs = context.state

  if (!context.state.name && inputs.name) {
    context.log(`Creating Google Cloud Function: '${inputs.name}'`)
    const location = `projects/${inputs.projectId}/locations/${inputs.locationId}`
    outputs = await generateUploadUrl(inputs.keyFilename, inputs.sourceCodePath, location)
    // outputs = await createFunction(inputs)
    outputs = {
      status: '200',
      serviceAccountEmail: 'xxx@yyy.com',
      updateTime: '2018-06-22 00:00:00',
      versionId: '1.0'
    }
  }
  context.saveState({ ...inputs, ...outputs })
  return outputs
}

module.exports = {
  deploy
}
