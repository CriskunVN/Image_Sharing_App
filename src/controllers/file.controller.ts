import { File, validate } from "../models/file.model";
import { Request, Response } from "express";
const BASE_URL = "https://ed-5313042160418816.educative.run";

export const upload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = validate(req.body);
    if (error) {
      res
        .status(400)
        .json({ message: error.details?.[0]?.message || "Invalid input" });
      return;
    }

    const { name, description } = req.body;
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }
    const path = req.file.path;

    const file = await File.create({
      name,
      createdBy: (req.user as any).user_id, // hoặc đúng type nếu đã mở rộng
      description,
      createdAt: Date.now(),
      filePath: BASE_URL + "/" + path,
    });

    console.log("File uploaded:", file.filePath);

    res.status(201).json({ message: "File uploaded successfully", data: file });
  } catch (err: any) {
    console.log(err);
    res.status(400).json({ message: err.message });
    return;
  }
};
