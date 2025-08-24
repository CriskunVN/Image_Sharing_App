import cors from "cors";

export default cors({
  origin: "*", // Hoặc thay bằng domain frontend của bạn, ví dụ: "http://localhost:3000"
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
  credentials: true,
});
