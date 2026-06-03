import svgCaptcha from 'svg-captcha';

const captchaStore = new Map();

export const generateCaptcha = (req, res) => {
  const captcha = svgCaptcha.create({
    size: 5,
    noise: 3,
    color: true,
    background: '#f0f0f0',
  });

  const captchaId = crypto.randomUUID();
  captchaStore.set(captchaId, {
    text: captcha.text.toLowerCase(),
    expires: Date.now() + 5 * 60 * 1000,
  });

  // cleanup expired
  for (const [key, val] of captchaStore) {
    if (val.expires < Date.now()) captchaStore.delete(key);
  }

  res.json({ captchaId, svg: captcha.data });
};

export const verifyCaptcha = (req, res, next) => {
  const { captchaId, captchaText } = req.body;

  if (!captchaId || !captchaText) {
    return res.status(400).json({ error: 'Капча обязательна' });
  }

  const stored = captchaStore.get(captchaId);
  captchaStore.delete(captchaId);

  if (!stored || stored.expires < Date.now()) {
    return res.status(400).json({ error: 'Капча истекла' });
  }

  if (stored.text !== captchaText.toLowerCase()) {
    return res.status(400).json({ error: 'Неверная капча' });
  }

  next();
};
