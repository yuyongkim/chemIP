import React from 'react';

export default function OperationsGuidePage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <header className="mb-10 border-b pb-6">
                <h1 className="text-3xl font-bold mb-2">Operations Guide</h1>
                <p className="text-gray-600">Guide for deployment and daily operation.</p>
            </header>

            <section className="mb-12">
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                    <span className="mr-2">📦</span> What to Include / Exclude in Git
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
                            <span className="mr-2">✅</span> Should Be in Git
                        </h3>
                        <ul className="space-y-2 text-sm text-green-900 font-mono">
                            <li>MSDS/</li>
                            <li>├── backend/ <span className="text-green-600 ml-2"># Backend source code</span></li>
                            <li>├── frontend/ <span className="text-green-600 ml-2"># Frontend source code</span></li>
                            <li>├── scripts/ <span className="text-green-600 ml-2"># Indexing scripts</span></li>
                            <li>├── tests/ <span className="text-green-600 ml-2"># Test code</span></li>
                            <li>├── docs/ <span className="text-green-600 ml-2"># Documentation</span></li>
                            <li>├── .gitignore <span className="text-green-600 ml-2"># Git exclusion config</span></li>
                            <li>├── README.md <span className="text-green-600 ml-2"># Project description</span></li>
                            <li>└── requirements.txt <span className="text-green-600 ml-2"># Python dependencies</span></li>
                        </ul>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center">
                            <span className="mr-2">❌</span> Should NOT Be in Git
                        </h3>
                        <ul className="space-y-2 text-sm text-red-900 font-mono">
                            <li>data/ <span className="text-red-600 ml-2"># 140GB DB files</span></li>
                            <li>.venv/ <span className="text-red-600 ml-2"># Python virtual environment</span></li>
                            <li>node_modules/ <span className="text-red-600 ml-2"># npm packages</span></li>
                            <li>.env <span className="text-red-600 ml-2"># API keys and secrets</span></li>
                            <li>*.db <span className="text-red-600 ml-2"># Database files</span></li>
                            <li>*.log <span className="text-red-600 ml-2"># Log files</span></li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                    <span className="mr-2">🗄️</span> 140GB Database Sharing Methods
                </h2>
                <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-100 uppercase">
                            <tr>
                                <th className="px-4 py-3 border">Method</th>
                                <th className="px-4 py-3 border">Pros</th>
                                <th className="px-4 py-3 border">Cons</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="px-4 py-3 border font-semibold">1. NAS / Shared Drive</td>
                                <td className="px-4 py-3 border text-green-600">Direct team access</td>
                                <td className="px-4 py-3 border text-red-600">No external access</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 border font-semibold">2. Cloud (S3, GCS)</td>
                                <td className="px-4 py-3 border text-green-600">Download from anywhere</td>
                                <td className="px-4 py-3 border text-red-600">Cost involved</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 border font-semibold">3. External Hard Drive</td>
                                <td className="px-4 py-3 border text-green-600">Fastest transfer</td>
                                <td className="px-4 py-3 border text-red-600">Physical delivery required</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 border font-semibold">4. Local Regeneration</td>
                                <td className="px-4 py-3 border text-green-600">Always up-to-date</td>
                                <td className="px-4 py-3 border text-red-600">Takes 24-48 hours</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                    <p className="text-sm font-bold text-gray-400 mb-2">Recommended: Cloud or NAS sharing (AWS S3 example)</p>
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                        {`# Upload
aws s3 cp data/global_patent_index.db s3://your-bucket/msds-db/

# Download
aws s3 cp s3://your-bucket/msds-db/global_patent_index.db data/`}
                    </pre>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                    <span className="mr-2">🖥️</span> Backend Operations
                </h2>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold mb-3">Development Environment (Local)</h3>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                                {`# 1. Activate virtual environment + start server
cd C:\\Users\\USER\\Desktop\\MSDS
.\\.venv\\Scripts\\activate
uvicorn backend.main:app --reload --port 8000`}
                            </pre>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-3">Production Environment - Docker (Recommended)</h3>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                                {`# Build and run Dockerfile
docker build -t chemip-backend .
docker run -d -p 8000:8000 -v /path/to/data:/app/data chemip-backend`}
                            </pre>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                    <span className="mr-2">🔄</span> Collaboration Workflow
                </h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-800 mb-4">New Team Member Onboarding</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                        <pre className="text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                            {`# 1. Clone the repository
git clone [your-repo-url]
cd MSDS

# 2. Set up Python virtual environment
python -m venv .venv
.\\.venv\\Scripts\\activate
pip install -r requirements.txt

# 3. Create .env file (enter API keys)
# KOSHA_SERVICE_KEY_DECODED=xxxxx

# 4. Download the database
aws s3 sync s3://bucket/msds-data/ data/

# 5. Set up and run the frontend
cd frontend
npm install
npm run dev`}
                        </pre>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                    <span className="mr-2">📋</span> Summary Checklist
                </h2>
                <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                        <h3 className="font-bold mb-2">Before Git Push</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            <li>Verify .gitignore includes data/, .env, *.db</li>
                            <li>Confirm no sensitive API keys are hardcoded</li>
                            <li>Ensure requirements.txt is up to date</li>
                        </ul>
                    </div>
                    <div className="border rounded-lg p-4">
                        <h3 className="font-bold mb-2">Team Onboarding</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            <li>Grant Git repository access</li>
                            <li>Share .env file contents via secure channel</li>
                            <li>Provide instructions for 140GB DB file sharing</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
