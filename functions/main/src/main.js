import { Client, Databases } from 'node-appwrite';

// This is your Appwrite function
// It's executed each time we get a request
export default async ({ req, res, log, error }) => {
  // Why not try the Appwrite SDK?
  //

  const client = new Client()
    .setEndpoint('https://baas.powermap.live/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const databases = new Databases(client);

  try {
    let promise = await databases.listDocuments(
      '659eacd792b60f142082',
      '659eaceec0cffe8ed41b',
    )

    promise.then(function (response) {
      log(response);
    }, function (error) {
      error(error);
    });

  } catch (e) {
    error("Failed to fetch assets: " + e.message)
    return res.send("Failed to fetch asset")
  }




  // `res.json()` is a handy helper for sending JSON
  return res.json({
    status: '200',
  });
};
