export const shouldRejectRapidOcrUpload = (status) => [400, 413, 422].includes(status);

export const shouldUseLocalOcrFallback = (status) =>
  status === undefined || status === 502 || status === 503 || status === 504;
