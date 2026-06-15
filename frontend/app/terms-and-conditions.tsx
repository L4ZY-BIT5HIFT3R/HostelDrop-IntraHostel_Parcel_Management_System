import PolicyDocument, { PolicySection } from '../components/PolicyDocument';

const TERMS_SECTIONS: PolicySection[] = [
  {
    title: '1. Purpose of the App',
    body: 'This application is intended for hostel parcel intake, tracking, and handover records managed by authorized hostel staff and registered students.',
  },
  {
    title: '2. User Accounts and Roles',
    body: 'Access is role-based (Student, Guard, Admin). Users must use their own assigned credentials and are responsible for actions performed through their accounts.',
  },
  {
    title: '3. Acceptable Use',
    body: 'Users must not create fake parcel records, manipulate delivery logs, or access data outside their permitted role. Any misuse can lead to immediate access suspension.',
  },
  {
    title: '4. Parcel Handover Rules',
    body: 'Handover should occur only after identity verification. App records are part of the hostel audit trail and should be kept accurate and timely.',
  },
  {
    title: '5. Service Availability',
    body: 'The app may undergo maintenance or updates. While reasonable uptime is targeted, uninterrupted availability cannot be guaranteed at all times.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'The system supports logging and operations. It is not liable for courier delays, parcel damage before hostel receipt, or losses outside operational control.',
  },
  {
    title: '7. Policy Updates',
    body: 'These terms may be updated to meet institutional and legal requirements. Continued use after updates indicates acceptance of revised terms.',
  },
  {
    title: '8. Contact',
    body: 'For account or policy-related concerns, contact your hostel administration office or the designated system administrator.',
  },
];

export default function TermsAndConditions() {
  return (
    <PolicyDocument
      stamp="TERMS"
      title="Terms & Conditions"
      intro="Please read these terms carefully before using the hostel parcel management system."
      sections={TERMS_SECTIONS}
      lastUpdated="April 14, 2026"
    />
  );
}
