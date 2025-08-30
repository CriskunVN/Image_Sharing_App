import { File, validate } from "../models/file.model";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import readline from "readline";
import * as simpleSpellchecker from "simple-spellchecker";
import sharp from "sharp";
import stringSimilarity from "string-similarity";
const BASE_URL = "https://ed-5313042160418816.educative.run";

//Type
type FileFilter = {
  name?: RegExp;
  description?: RegExp;
  createdAt?: Date;
};

// Process image
const processImage = async (pathFile: string): Promise<string> => {
  try {
    const imgInstnace = sharp(pathFile);
    const metadata = await imgInstnace.metadata();
    const newPath = pathFile.split(".")[0] + "-img.jpeg";
    imgInstnace
      .resize({
        width: 350,
        fit: sharp.fit.contain,
      })
      .blur(1)
      .toFormat("jpeg", { mozjpeg: true })
      .composite([
        {
          input: "uploads/logo.png",
          gravity: "center",
        },
      ])
      .toFile(newPath);

    return newPath;
  } catch (error) {
    console.log(
      `An error occurred during processing the uploaded image: ${error}`
    );
  }
  return pathFile;
};

// Process text file
const SpellChecker = simpleSpellchecker.getDictionarySync("en-GB");

const spellCheck = async (path: string) => {
  const readInterface = readline.createInterface({
    input: fs.createReadStream(path),
    output: process.stdout,
  });

  let text: string = "";

  for await (const line of readInterface) {
    const correctedLine = line
      .split(" ")
      .map((word) => {
        if (!SpellChecker.spellCheck(word)) {
          const suggestions = SpellChecker.getSuggestions(word);
          const matches = stringSimilarity.findBestMatch(
            word,
            suggestions.length === 0 ? [word] : suggestions
          );

          return matches.bestMatch.target;
        } else {
          return word;
        }
      })
      .join(" ");
    text += correctedLine + "\n";
  }

  fs.writeFile(path, text, (err: any): void => {
    if (err) console.log("error", err);
  });
};

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
    let path: string = req.file.path;

    if (req.file.mimetype.match(/^image/)) {
      await processImage(req.file.path);
    }

    if (req.file.mimetype === "text/plain") {
      await spellCheck(req.file.path);
      path = `${req.file.path}.txt`;
    }

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

// ENDPOINT API

export const getAllFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { createdBy } = req.params;
    const files = await File.find({ createdBy: createdBy });
    res
      .status(200)
      .json({ message: "Files retrieved successfully", data: files });
  } catch (err: any) {
    console.log(err);
    res.status(400).json({ message: err.message });
    return;
  }
};

export const getFileById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { createdBy, fileId } = req.params;
    const file = await File.findOne({ _id: fileId, createdBy });
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    res
      .status(200)
      .json({ message: "File retrieved successfully", data: file });
  } catch (err: any) {
    console.log(err);
    res.status(400).json({ message: err.message });
    return;
  }
};

export const searchFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const filter: FileFilter = {};

    if (req.query.name) filter.name = /req.query.name/;
    if (req.query.description) filter.description = /req.query.description/;
    if (req.query.createdAt) {
      const dateValue = Array.isArray(req.query.createdAt)
        ? req.query.createdAt[0]
        : req.query.createdAt;
      filter.createdAt = new Date(dateValue as string);
    }

    const files = await File.find(filter);
  } catch (err: any) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
};

export const updateFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const fileId = req.params.fileId;

    const { name, description } = req.body;
    if (!name || !description) {
      res.status(400).json({ message: "Name and description are required" });
      return;
    }
    const result = await File.findOne({ _id: fileId });

    if (!result) {
      res.status(400).json({
        status: "fail",
        message: "Not found file with id",
      });
    }
    const dataUpdate = await File.updateOne(
      { _id: fileId },
      { name, description },
      { upsert: true }
    );
    res.status(200).json({
      status: "success",
      message: "File updated successfully",
      data: dataUpdate,
    });
  } catch (err: any) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
};

export const deleteFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fileId } = req.params;
    const result = await File.deleteOne({ _id: fileId });
    if (result.deletedCount === 0) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    res.status(200).json({ message: "File deleted successfully" });
  } catch (err: any) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
};
