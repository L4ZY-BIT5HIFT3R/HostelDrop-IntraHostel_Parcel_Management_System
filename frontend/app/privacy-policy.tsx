import PolicyDocument, { PolicySection } from '../components/PolicyDocument';

const PRIVACY_SECTIONS: PolicySection[] = [
  {
    title: '1. Data We Collect',
    body: 'We may collect user profile details (name, role, hostel details, roll number), authentication data, and parcel event logs including timestamps and status changes.',
  },
  {
    title: '2. Why Data Is Collected',
    body: 'Data is used for secure authentication, role-based access, parcel tracking, audit records, and operational reporting for hostel management.',
  },
  {
    title: '3. Access and Sharing',
    body: 'Data access is restricted by role. Information is shared only with authorized institutional personnel or service providers required for system operations.',
  },
  {
    title: '4. Data Retention',
    body: 'Operational and audit records are retained according to institutional policy and legal requirements, then securely archived or removed.',
  },
  {
    title: '5. Security Measures',
    body: 'The system uses access controls and secure handling practices to protect user accounts and parcel records from unauthorized use.',
  },
  {
    title: '6. Your Responsibilities',
    body: 'Users should protect their credentials, avoid unauthorized sharing, and report suspicious account activity immediately.',
  },
  {
    title: '7. Policy Changes',
    body: 'This privacy policy may be updated when required by institutional, operational, or legal changes. Updated versions apply upon publication.',
  },
  {
    title: '8. Contact for Privacy Queries',
    body: 'For corrections, access concerns, or data-related requests, contact your hostel administration office or system administrator.',
  },
];

export default function PrivacyPolicy() {
  return (
    <PolicyDocument
      stamp="PRIVACY"
      title="Privacy Policy"
      intro="This section explains what information is used in the app and how it is handled."
      sections={PRIVACY_SECTIONS}
      lastUpdated="April 14, 2026"
    />
  );
}
