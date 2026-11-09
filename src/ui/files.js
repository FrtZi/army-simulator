// Files the player saves or picks: a download made in the page, and a picked file's text. Nothing is ever sent.

/** Offers a text as a file to save; the address is revoked after the click, once the download has started (DEF-022). */
export function downloadFile(name, text, type = "application/json") {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href)); // some browsers start the download after the click returns
  return link.download;
}

/** A picked file's text (FileReader: supported everywhere, unlike File.text() in some environments). */
export const readText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
