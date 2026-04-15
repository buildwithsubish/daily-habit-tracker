import connectDB from '../mongodb';

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: { readyState: 0 },
}));

const mockMongoose = require('mongoose');

describe('MongoDB Connection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    delete (global as any).mongoose;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw error when MONGODB_URI is not defined', async () => {
    delete process.env.MONGODB_URI;
    
    await expect(connectDB()).rejects.toThrow(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  });

  it('should connect when MONGODB_URI is defined', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    mockMongoose.connect.mockResolvedValue(mockMongoose);
    
    await expect(connectDB()).resolves.toBeDefined();
    expect(mockMongoose.connect).toHaveBeenCalledWith(
      'mongodb://localhost:27017/test',
      { bufferCommands: false }
    );
  });
});
