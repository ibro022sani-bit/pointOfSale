export function success(res, data, message = 'Success') {
  return res.status(200).json({ success: true, message, data })
}

export function error(res, message = 'Something went wrong', status = 400) {
  return res.status(status).json({ success: false, message })
}