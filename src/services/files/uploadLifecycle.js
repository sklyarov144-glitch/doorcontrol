export async function persistUploadedFile({ upload, persist, remove }) {
  const uploaded = await upload();
  try {
    return await persist(uploaded);
  } catch (error) {
    try {
      await remove(uploaded);
    } catch (cleanupError) {
      console.error("Unable to remove an unreferenced uploaded file", cleanupError);
    }
    throw error;
  }
}

