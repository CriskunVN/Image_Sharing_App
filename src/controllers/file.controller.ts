import { File, validate } from "../models/file.model";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import readline from "readline";
import * as simpleSpellchecker from "simple-spellchecker";
import sharp from "sharp";
import stringSimilarity from "string-similarity";
const BASE_URL = "https://ed-5313042160418816.educative.run";

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
