import express from "express";
import dotenv from "dotenv";
import { notFound } from "./src/middlewares/notFound.js";
import { handleError } from "./src/middlewares/handleError.js";
import policyholdersRoute from "./src/resources/policyholders/policyholdersRoute.routes.js";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(express.json());

// api routes
app.use("/api/policyholders",policyholdersRoute)

app.use(notFound);
app.use(handleError);

app.listen(port, () => {!
  console.log(`server running on port ${port}`);
});
