import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role:              { type: String, enum: ['user', 'assistant', 'error'], required: true },
  content:           { type: String, required: true },
  detectedLanguage:  { type: String },
}, { timestamps: true, _id: true });

const conversationSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:          { type: String, default: 'New Conversation' },
  targetLanguage: { type: String, default: 'English' },
  messages:       [messageSchema],
  lastMessage:    { type: String },
  messageCount:   { type: Number, default: 0 },
}, { timestamps: true });

// Keep lastMessage and messageCount in sync
conversationSchema.methods.addMessages = function(...msgs) {
  this.messages.push(...msgs);
  this.messageCount = this.messages.length;
  const last = this.messages[this.messages.length - 1];
  this.lastMessage = last?.content?.substring(0, 80) || '';
  // Keep bounded to 200 msgs per conversation
  if (this.messages.length > 200) this.messages.splice(0, this.messages.length - 200);
};

export default mongoose.model('Conversation', conversationSchema);
