export function newsletterHtml(campaign) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>

<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:40px;">

<div style="max-width:700px;background:white;margin:auto;padding:40px;border-radius:10px;">

<h1>${campaign.title}</h1>

${campaign.bannerImage
? `<img src="${campaign.bannerImage}" style="width:100%;border-radius:8px;margin-bottom:20px;">`
: ""}

<div>

${campaign.content}

</div>

<br>

<hr>

<p style="font-size:12px;color:#888;">
You received this email because you subscribed to our newsletter.
</p>

</div>

</body>
</html>
`;
}