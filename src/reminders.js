/**
 * Monthly maintenance reminders (push notifications to phones where the app is installed).
 * Shared by the app (admin settings) and scripts/send-reminders.mjs (the sender that runs on GitHub every hour).
 */

/** Public half of the push key pair. Safe to publish; the private half is the VAPID_PRIVATE_KEY secret. */
export const PUSH_PUBLIC_KEY = 'BAkWd27qJzHMUMY0plnl1ZDzBnX6cMQtxeeO2dUWIP3W1MBJYWMkMlaJwasPWQcEyAJIZjaKp0k1QfqWuP1Cwjw'

/** Used until an admin saves their own settings. Times are India time (IST), whole hours. */
export const DEFAULT_REMINDERS = {
  enabled: true,
  days: [1, 2],
  messages: [
    { time: '10:00', title: 'મેન્ટેનન્સ યાદી 🔔', body: 'નમસ્તે 🙏 આ મહિનાનું મેન્ટેનન્સ ભરવાનું યાદ રાખશો. આભાર — આસ્થા રેસિડેન્સી' },
    { time: '19:00', title: 'મેન્ટેનન્સ યાદી 🔔', body: 'મેન્ટેનન્સ હજુ બાકી હોય તો આજે જ ભરી દેશો. આભાર 🙏' },
  ],
}
