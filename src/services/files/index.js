import { dataProviderName } from "../dataProvider";
import { localFileService } from "./localFileService";
import { supabaseFileService } from "./supabaseFileService";

export const fileService = dataProviderName === "supabase" ? supabaseFileService : localFileService;

