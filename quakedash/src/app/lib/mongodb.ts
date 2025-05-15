import { MongoClient, Db } from 'mongodb';

// const uri = 'mongodb://localhost:27017';
const uri = 'mongodb://mongo-server:27017';

const StreamingDBName = 'streaming_data';
const batchDbName = 'disasterDB';
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

const getClient = () => {
  if (!client) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise!;
};

export const getStreamingDb = async (): Promise<Db> => {
  const client = await getClient();
  return client.db(StreamingDBName);
};
export const getBatchDb = async (): Promise<Db> => {
  const client = await getClient();
  return client.db(batchDbName);
};
export default getClient;