import { Link } from "react-router";
import { FiShield, FiArrowLeft } from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";

export default function Privacy() {
    return (
        <>
            <PageMeta
                title="Privacy Policy | SecureSphere"
                description="Privacy Policy for SecureSphere"
            />

            <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
                <div className="mx-auto max-w-4xl">

                    {/* Header */}
                    <div className="mb-8">
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-500"
                        >
                            <FiArrowLeft />
                            Back to Sign Up
                        </Link>

                        <div className="mt-6 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                                <FiShield className="text-xl" />
                            </div>

                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                                    Privacy Policy
                                </h1>

                                <p className="mt-1 text-sm text-gray-500">
                                    Last updated: August 23, 2026
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-10">

                        <PrivacySection title="1. Introduction">
                            <p>
                                SecureSphere respects your privacy. This Privacy Policy
                                explains what information may be collected when you use the
                                SecureSphere platform and how that information may be used.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="2. Information We Collect">
                            <p>Depending on how you use the platform, we may collect:</p>

                            <ul className="mt-3 list-disc space-y-2 pl-6">
                                <li>Name and email address.</li>
                                <li>Account and authentication information.</li>
                                <li>Websites or domains submitted for security scanning.</li>
                                <li>Security scan results and vulnerability information.</li>
                                <li>Platform usage and technical information.</li>
                            </ul>
                        </PrivacySection>

                        <PrivacySection title="3. How We Use Information">
                            <p>Information may be used to:</p>

                            <ul className="mt-3 list-disc space-y-2 pl-6">
                                <li>Create and manage your account.</li>
                                <li>Perform requested security scans.</li>
                                <li>Display security results and analytics.</li>
                                <li>Generate security recommendations.</li>
                                <li>Improve the platform.</li>
                                <li>Provide account and security notifications.</li>
                                <li>Protect the platform from abuse.</li>
                            </ul>
                        </PrivacySection>

                        <PrivacySection title="4. Website and Scan Data">
                            <p>
                                When you submit a website or domain for scanning, SecureSphere
                                may process technical information obtained during the
                                security assessment.
                            </p>

                            <p className="mt-3">
                                You should only submit websites and systems that you own or
                                are authorized to test.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="5. AI Processing">
                            <p>
                                SecureSphere may use AI services to analyze security findings
                                and generate explanations or remediation recommendations.
                            </p>

                            <p className="mt-3">
                                AI-generated information should be considered security
                                guidance and should be reviewed before being applied to a
                                production environment.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="6. Cookies and Local Storage">
                            <p>
                                SecureSphere may use cookies, local storage, or similar
                                technologies to maintain authentication sessions, remember
                                preferences, and improve platform functionality.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="7. Data Security">
                            <p>
                                We take reasonable technical and organizational measures to
                                protect information against unauthorized access, alteration,
                                disclosure, or destruction.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="8. Data Sharing">
                            <p>
                                We do not intentionally sell your personal information.
                                Information may be processed by service providers when
                                necessary to operate platform functionality, such as hosting,
                                authentication, email, payments, or AI services.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="9. Data Retention">
                            <p>
                                Information may be retained for as long as reasonably
                                necessary to provide the platform, maintain security,
                                comply with legal obligations, and resolve disputes.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="10. Your Rights">
                            <p>
                                Depending on applicable law, you may have rights regarding
                                access, correction, deletion, or other processing of your
                                personal information.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="11. Third-Party Services">
                            <p>
                                SecureSphere may integrate with third-party services.
                                Information processed by those services may be subject to
                                their respective privacy policies and terms.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="12. Children's Privacy">
                            <p>
                                SecureSphere is not intended for children who are below the
                                minimum age required to use online services under applicable
                                law.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="13. Changes to This Policy">
                            <p>
                                We may update this Privacy Policy when our services,
                                practices, or legal requirements change. The updated version
                                will be published on this page.
                            </p>
                        </PrivacySection>

                        <PrivacySection title="14. Contact">
                            <p>
                                If you have questions about this Privacy Policy or your
                                information, please contact the SecureSphere support team.
                            </p>
                        </PrivacySection>

                    </div>
                </div>
            </div>
        </>
    );
}

function PrivacySection({ title, children }) {
    return (
        <section className="mb-8 last:mb-0">
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
                {title}
            </h2>

            <div className="text-sm leading-7 text-gray-600 dark:text-gray-400">
                {children}
            </div>
        </section>
    );
}