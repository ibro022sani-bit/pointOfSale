import LegalPage from './LegalPage'
import {
  APP_NAME, COMPANY_NAME, COMPANY_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE, DATA_RETENTION_DAYS, ARCHIVE_MONTHS,
} from '../../config/brand'

const US = COMPANY_NAME || APP_NAME

const sections = [
  {
    heading: 'Who we are',
    body: [
      `${US} provides ${APP_NAME}, a point of sale and inventory service. For the account details of the businesses that sign up, we decide how the information is used. For the business records that a business enters (such as its sales and customers), the business decides how they are used and we process them on its behalf.`,
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'Account details: your business name, your name, email address and phone number, and a password, which we store only in a scrambled (hashed) form that we cannot read.',
      'Business records you enter: products, stock, sales, payments, expenses, staff accounts, and your customers\' names, phone numbers and addresses.',
      'Technical information: your IP address, device and browser details, and activity logs, used to keep the service secure and to prevent abuse such as repeated failed sign-ins.',
      'Referral details: if you take part in our referral programme, your name, phone number and referral earnings.',
      'Customer contact: when you tap SMS or WhatsApp to contact a customer, the message is prepared by the app but sent from your own phone and account. We only note the date a debt reminder was opened.',
    ],
  },
  {
    heading: 'Why we use it',
    body: [
      'To run your account and provide the service, to keep it secure, to manage your subscription and payments, to give you support, and to meet our legal obligations. We do not use your business records for advertising and we do not sell them.',
    ],
  },
  {
    heading: 'Who we share it with',
    body: [
      `We use trusted service providers to run ${APP_NAME}: cloud hosting and database providers (currently Vercel and Supabase). They handle data only to provide their service to us. We may also share information when the law requires it.`,
      'Our providers may store or process data in other countries. We take reasonable steps to make sure it stays protected.',
    ],
  },
  {
    heading: 'How businesses are kept separate',
    body: [
      'Each business\'s records are kept apart from every other business, and a business can only see its own data. Inside a business, the owner decides what each staff role can see and do.',
    ],
  },
  {
    heading: 'Security',
    body: [
      'We protect your information with encrypted connections, hashed passwords, access controls and limits on repeated sign-in attempts. No system is completely secure, but we work to protect your data and, if a breach affects you, we will act and inform those affected as the law requires.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      `We keep your information while your account is active. If your account is deactivated, we keep it on our live system for ${DATA_RETENTION_DAYS} days. After that we remove it from the live system and keep an encrypted archive copy for ${ARCHIVE_MONTHS} months, so it can be restored if you return. We then delete the archive permanently, and you can ask us to delete it sooner. We may keep certain records, such as your payments to us, for longer where the law requires.`,
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'Under the Nigeria Data Protection Act 2023, you have the right to ask for access to your personal data, to have it corrected or deleted, to object to or restrict how it is used, to take a copy of it, and to withdraw consent where we rely on it. You can also complain to the Nigeria Data Protection Commission.',
      'If you are a customer of a business that uses ' + APP_NAME + ', please contact that business first, because it decides how your information is used. To exercise your rights with us, use the contact details below.',
    ],
  },
  {
    heading: 'Children',
    body: [`${APP_NAME} is for businesses and is not directed at children under 18.`],
  },
  {
    heading: 'Changes to this policy',
    body: ['We may update this policy and will show the date of the latest version at the top of this page.'],
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

function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={sections}
      other={{ to: '/terms', label: 'Terms of Service' }}
    />
  )
}

export default Privacy