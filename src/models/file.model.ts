import mongoose from "mongoose";
import Joi from "joi";

interface FileInput {
  filePath: string;
  name: string;
  description: string;
}

const fileSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: [true, "Uploaded file must have a name"],
  },
  description: {
    type: String,
    required: [true, "Uploaded file must have a description"],
  },
});

const File = mongoose.model("file", fileSchema);

const validate = (file: FileInput) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
  });
  return schema.validate(file);
};

export { File, validate };
