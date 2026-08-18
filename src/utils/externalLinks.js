const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;


export const normalizeSupportEmail = value => {
  if (typeof value !== 'string') {
    return null;
  }


  const email = value.trim();


  if (
    !email ||
    email.length > 254 ||
    /[\r\n]/.test(email) ||
    !EMAIL_PATTERN.test(email)
  ) {
    return null;
  }


  return email;
};


export const buildSupportEmailUrl = (
  recipient,
  {
    subject = '',
    body = '',
  } = {},
) => {
  const email =
    normalizeSupportEmail(
      recipient,
    );


  if (!email) {
    return null;
  }


  const encodedRecipient =
    encodeURIComponent(
      email,
    ).replace(
      /%40/gi,
      '@',
    );

  const query = [
    subject
      ? `subject=${encodeURIComponent(subject)}`
      : null,
    body
      ? `body=${encodeURIComponent(body)}`
      : null,
  ]
    .filter(Boolean)
    .join('&');


  return `mailto:${encodedRecipient}${
    query ? `?${query}` : ''
  }`;
};


export const getSafeHttpsUrl = value => {
  if (typeof value !== 'string') {
    return null;
  }


  const candidate =
    value.trim();


  if (!candidate) {
    return null;
  }


  try {
    const parsed =
      new URL(candidate);


    if (
      parsed.protocol !== 'https:' ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }


    return parsed.toString();

  } catch (error) {
    return null;
  }
};
