import LegalPage from './LegalPage'
import {
  APP_NAME, COMPANY_NAME, COMPANY_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE, DATA_RETENTION_DAYS, ARCHIVE_MONTHS,
} from '../../config/brand'

const US = COMPANY_NAME || APP_NAME

const sections = [
  {
    heading: 'About these terms',
    body: [
      `${APP_NAME} is a point of sale and inventory service provided by ${US} ("we", "us"). By creating an account or using ${APP_NAME}, you agree to these terms on behalf of your business. If you do not agree, please do not use the service.`,
    ],
  },
  {
    heading: 'Accounts and activation',
    body: [
      'We review every new account before it can be used, and we may decline or delay an activation. Until we activate your account, you will not be able to sign in.',
      'You must give accurate information, and you confirm that you are allowed to act for the business you register. You are responsible for your staff accounts, for keeping passwords secret, and for everything done under your account.',
    ],
  },
  {
    heading: 'Subscription and payment',
    body: [
      `Access to ${APP_NAME} is paid for in advance for the period we agree with you. Your account shows a "paid until" date.`,
      'If payment is not received by the end of the paid period, we allow a short grace period (currently 3 days). After that your account is deactivated automatically. When your account is deactivated, you and your staff cannot sign in or sync data until payment is made and we reactivate it.',
      'Fees are not refundable, except where the law requires otherwise.',
    ],
  },
  {
    heading: 'Your data',
    body: [
      `The information you enter into ${APP_NAME} (such as products, stock, sales, staff and customer records) belongs to you. We process it only to provide the service to you.`,
      'If you record personal information about your own customers, you are responsible for having a lawful reason to do so and for handling it in line with the law. In that case you decide why and how it is used, and we process it on your behalf.',
      'We do not sell your data, and each business can only see its own data.',
    ],
  },
  {
    heading: 'Suspended accounts and your data',
    body: [
      `While an account is suspended we keep its data on our live system for ${DATA_RETENTION_DAYS} days, counted from the day it was suspended. If it is reactivated in that time, everything is still there.`,
      `After that we remove your data from our live system. We keep a secure, encrypted archive copy for ${ARCHIVE_MONTHS} months so that, if you return, we can restore it for you. Restoring needs your account to be paid up, and a restoration fee may apply. When the archive period ends we delete the archive copy permanently.`,
      'You can ask us for a copy of your data at any time, and you can ask us to delete your archive earlier. We may keep records of your payments to us for as long as the law requires.',
    ],
  },
  {
    heading: 'Acceptable use',
    body: [
      'You must not use the service for anything unlawful, try to access another business\'s data, interfere with or overload the service, copy or reverse engineer the software, or use the messaging links to send spam or unwanted messages.',
      'We may suspend an account that breaks these rules.',
    ],
  },
  {
    heading: 'Contacting your customers',
    body: [
      'Reminders and other messages to your customers are opened in your own phone\'s SMS or WhatsApp app and are sent from your own number or account, not by us. You are responsible for the content of the messages you send and for having your customers\' permission to contact them.',
    ],
  },
  {
    heading: 'Offline use and availability',
    body: [
      `${APP_NAME} is designed to keep working without internet and to sync when a connection returns. We work to keep the service available, but we cannot promise it will always be uninterrupted or error-free. Please keep your own records of anything critical to your business.`,
    ],
  },
  {
    heading: 'Referral programme',
    body: [
      'Where we run a referral programme, we decide the reward and may change it at any time. The reward that applies is the one set when the business you referred makes its first payment to us.',
      'Rewards are earned only for genuine new businesses. We may withhold or cancel a reward if we believe a referral is fake, was made by the business itself, or breaks these terms.',
      'Rewards are given in the form we choose, as money or as free subscription time, and cannot be transferred.',
    ],
  },
  {
    heading: 'Our software',
    body: [
      `We own ${APP_NAME} and its software. While your subscription is active, you may use it for your own business. This does not transfer any ownership to you.`,
    ],
  },
  {
    heading: 'Limits on our responsibility',
    body: [
      'The service is provided "as is". To the extent the law allows, we are not responsible for indirect or consequential losses, such as lost profit or lost business, and our total responsibility for any claim is limited to the fees you paid us in the three months before the event that caused it.',
    ],
  },
  {
    heading: 'Ending your use',
    body: [
      'You can stop using the service at any time. We may suspend or end your access if you break these terms or do not pay.',
    ],
  },
  {
    heading: 'Changes to these terms',
    body: [
      'We may update these terms from time to time. We will show the date of the latest version at the top of this page. If you keep using the service after a change, you accept the new terms.',
    ],
  },
  {
    heading: 'Governing law',
    body: ['These terms are governed by the laws of the Federal Republic of Nigeria.'],
  },
  {
    heading: 'Contact',
    body: [
      [US, COMPANY_ADDRESS, CONTACT_EMAIL && `Email: ${CONTACT_EMAIL}`, CONTACT_PHONE && `Phone: ${CONTACT_PHONE}`]
        .filter(Boolean)
        .join(' · '),
    ],
  },
]

function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={sections}
      other={{ to: '/privacy', label: 'Privacy Policy' }}
    />
  )
}

export default Terms