import {
  DynamoDBClient,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  PutCommandOutput,
  DeleteCommandOutput,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

export class DynamoClient {
  private ddb: DynamoDBDocumentClient;
  private tableName: string;
  private partitionKey: string;
  private sortKey?: string;

  constructor({
    tableName,
    region = 'us-east-1',
    partitionKey,
  }: {
    tableName: string;
    region?: string;
    partitionKey: string;
  }) {
    const client = new DynamoDBClient({ region });
    this.ddb = DynamoDBDocumentClient.from(client);
    this.tableName = tableName;
    this.partitionKey = partitionKey;
  }

  async get(key: Record<string, any>): Promise<Record<string, any> | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: key,
    });

    return await this.ddb.send(command).then((o) => o.Item ?? null);
  }

  async put(item: Record<string, any>): Promise<PutCommandOutput> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    return await this.ddb.send(command);
  }

  async create(item: Record<string, any>): Promise<Record<string, any>> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(#pk)',
        ExpressionAttributeNames: { '#pk': this.partitionKey },
      });

      await this.ddb.send(command);

      return item;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new Error(
          `Item with ${this.partitionKey} '${item[this.partitionKey]}' already exists`,
          { cause: { statusCode: 409 } }
        );
      }
      throw err;
    }
  }

  async incrementCounter(): Promise<number> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { [this.partitionKey]: 'counter' },
      UpdateExpression: 'ADD #counter :inc',
      ExpressionAttributeNames: {
        '#counter': 'counter',
      },
      ExpressionAttributeValues: {
        ':inc': 1,
      },
      ReturnValues: 'UPDATED_NEW',
    });

    const result = await this.ddb.send(command);
    return result.Attributes?.counter as number;
  }

  async delete(key: Record<string, any>): Promise<DeleteCommandOutput> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: key,
    });

    return await this.ddb.send(command);
  }
}
