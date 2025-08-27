import multer from "multer";

const storage = multer.diskStorage({
  destination: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, "uploads");
  },
  filename: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `item-${file.fieldname}-${Date.now()}.${ext}`);
  },
});

export const upload = multer({ storage });
