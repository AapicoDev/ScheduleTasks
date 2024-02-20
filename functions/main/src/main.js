import { Client, Databases, ID, Query } from 'node-appwrite';
import { getDaysDifference } from './utils.js';

export default async ({ req, res, log, error }) => {

  if (!process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    !process.env.APPWRITE_API_KEY ||
    !process.env.APPWRITE_DATABASE_ID ||
    !process.env.APPWRITE_COLLECTION_ID
  ) {
    return log("variables not set")
  }

  try {
    const client = new Client()
      .setEndpoint('https://baas.powermap.live/v1')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    let cursor = null;
    let process_logs = {};

    do {
      const queries = [Query.limit(100)];

      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const { documents } = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_COLLECTION_ID,
        queries
      );

      for (let index = 0; index < documents.length; index++) {
        // reset params 
        let maintenance_period;
        let last_maintenance;

        const document = documents[index];

        // check for maintenance //
        if (!document.last_maintenance) {
          last_maintenance = document.buy_date
        } else {
          last_maintenance = document.last_maintenance
        }

        log(`maintenance_period ${document.maintenance_period} ${index} ${document.asset_id}`)
        if (!document.maintenance_period) {
          if (!document.types.maintenance_period) {
            log(`Maintenance not set, ${document
              .asset_id}`)
          } else {
            maintenance_period = document.types.maintenance_period
          }
        } else {
          maintenance_period = document.maintenance_period
        }


        if (document.asset_status == "Available" && maintenance_period && getDaysDifference(document.buy_date) - maintenance_period > 0) {

          log(`asset that need maintenance ${document.asset_id}`);
          // create event
          await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_EVENT_COLLECTION_ID,
            ID.unique(),
            {
              asset_id: document.asset_id,
              asset_id_ref: document.$id,
              location: document?.locations?.name,
              description: "Scheduling Maintenance",
              event_type: "MaintenanceRequired",
              tenants: document.tenants.$id
            }
          );

          // change asset status to maintenance
          await databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_COLLECTION_ID,
            document.$id,
            {
              asset_status: "Maintenance"
            }
          );

          // create main maintenance request
          await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_MAINTENANCE_COLLECTION_ID,
            ID.unique(),
            {
              type: "schedule",
              requested_by: "System",
              tenants: document.tenants.$id,
              asset_id: document.asset_id,
              asset_id_ref: document.$id,
              note: "event created by system schedule"
            }
          );

          // create process_logs
          if (!process_logs[document.tenants.$id]) {
            process_logs[document.tenants.$id] = 1;
          } else {
            process_logs[document.tenants.$id] += 1;
          }

        }

      }




      if (documents.length > 0) {
        cursor = documents[documents.length - 1].$id;
      } else {
        log(`No more documents found.`);
        cursor = null;
        break;
      }

      log(`Syncing chunk of ${documents.length} documents ...`);
    } while (cursor !== null);

    // create process for each tenant
    Object.keys(process_logs).map(async (each, index) => {
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_PROCESS_LOGS_COLLECTION_ID,
        ID.unique(),
        {
          name: "maintenance_schedule",
          total: process_logs[each],
          tenants: each
        }
      );
    });

    log('Sync finished.');

    return res.send('Sync finished.', 200);

  } catch (e) {
    error("Failed to run schedule: " + e.message)
    return res.send("Failed to run schedule")
  }
};
