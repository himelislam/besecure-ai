import { Link } from "react-router";
import { FiShield, FiArrowLeft } from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";

export default function Terms() {
    return (
        <>
            <PageMeta
                title="Terms of Service | SecureSphere"
                description="Terms of Service for SecureSphere"
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
                                    Terms of Service
                                </h1>

                                <p className="mt-1 text-sm text-gray-500">
                                    Last updated: August 23, 2026
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-10">

                        <LegalSection title="1. Acceptance of Terms">
                            <p>
                                By creating an account or using SecureSphere, you agree to
                                these Terms of Service. If you do not agree with these terms,
                                you should not use the platform.
                            </p>
                        </LegalSection>

                        <LegalSection title="2. About SecureSphere">
                            <p>
                                SecureSphere is an AI-powered web security platform designed
                                to help users identify potential security vulnerabilities,
                                understand security risks, and receive security
                                recommendations.
                            </p>
                        </LegalSection>

                        <LegalSection title="3. Authorized Security Testing">
                            <p>
                                You may only scan websites, applications, domains, and systems
                                that you own or have explicit permission to test.
                            </p>

                            <p className="mt-3">
                                You are responsible for ensuring that your security testing
                                activities comply with applicable laws, regulations, contracts,
                                and third-party terms.
                            </p>
                        </LegalSection>

                        <LegalSection title="4. Prohibited Use">
                            <p>You must not use SecureSphere to:</p>

                            <ul className="mt-3 list-disc space-y-2 pl-6">
                                <li>Attack systems without authorization.</li>
                                <li>Disrupt or damage third-party services.</li>
                                <li>Attempt unauthorized access to accounts or systems.</li>
                                <li>Use the platform for illegal activities.</li>
                                <li>Upload malicious content.</li>
                                <li>Abuse or attempt to bypass platform security.</li>
                            </ul>
                        </LegalSection>

                        <LegalSection title="5. User Accounts">
                            <p>
                                You are responsible for maintaining the confidentiality of
                                your account credentials and for activities performed through
                                your account.
                            </p>

                            <p className="mt-3">
                                You should immediately notify SecureSphere if you believe your
                                account has been compromised.
                            </p>
                        </LegalSection>

                        <LegalSection title="6. Security Scan Results">
                            <p>
                                Security scan results are provided for informational and
                                defensive security purposes. A scan result does not guarantee
                                that a website or application is completely secure.
                            </p>
                        </LegalSection>

                        <LegalSection title="7. AI-Generated Information">
                            <p>
                                SecureSphere may use artificial intelligence to generate
                                vulnerability explanations, security recommendations, and
                                remediation guidance.
                            </p>

                            <p className="mt-3">
                                AI-generated recommendations may contain inaccuracies.
                                Users should verify recommendations before applying them to
                                production systems.
                            </p>
                        </LegalSection>

                        <LegalSection title="8. Availability">
                            <p>
                                We may modify, suspend, or discontinue parts of the platform
                                from time to time for maintenance, improvements, or other
                                operational reasons.
                            </p>
                        </LegalSection>

                        <LegalSection title="9. Disclaimer">
                            <p>
                                SecureSphere is provided on an "as is" and "as available"
                                basis. We do not guarantee that the platform will detect every
                                vulnerability or security issue.
                            </p>
                        </LegalSection>

                        <LegalSection title="10. Limitation of Liability">
                            <p>
                                To the extent permitted by applicable law, SecureSphere and
                                its operators shall not be responsible for losses resulting
                                from the use or inability to use the platform or from reliance
                                on security scan results.
                            </p>
                        </LegalSection>

                        <LegalSection title="11. Changes to These Terms">
                            <p>
                                We may update these Terms of Service from time to time.
                                Continued use of SecureSphere after changes are published
                                constitutes acceptance of the updated terms.
                            </p>
                        </LegalSection>

                        <LegalSection title="12. Contact">
                            <p>
                                If you have questions regarding these Terms of Service,
                                please contact the SecureSphere support team.
                            </p>
                        </LegalSection>

                    </div>
                </div>
            </div>
        </>
    );
}

function LegalSection({ title, children }) {
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