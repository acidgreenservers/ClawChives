import { useState } from "react";
import { Button } from "../ui/button";
import { Shield, Database, Users, Bot, Lock, Key, ArrowRight, Zap, Globe, FolderTree } from "lucide-react";

interface LandingPageProps {
  onCreateAccount: () => void;
  onLogin: () => void;
}

export function LandingPage({ onCreateAccount, onLogin }: LandingPageProps) {
  const [showKeyInfo, setShowKeyInfo] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-amber-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                <span className="text-2xl">🦞</span>
              </div>
              <span className="text-xl font-bold text-slate-900">ClawChives</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onLogin} className="text-slate-700 hover:text-slate-900">
                Login
              </Button>
              <Button 
                onClick={onCreateAccount}
                className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200"
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-8 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <img
              src="/src/assets/main-logo.png"
              alt="ClawChives Logo"
              style={{ 
                mixBlendMode: "multiply",
                filter: "brightness(1.1) contrast(1.1)"
              }}
              className="w-72 h-72 object-contain mx-auto -mb-12"
            />

            <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Local-First Sovereign Bookmarking
            </div>

            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              <span className="text-red-500">Claw</span>
              <span className="text-cyan-600">Chives</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-slate-600 mb-4 leading-relaxed">
              Your sovereign bookmark library where <span className="text-cyan-700 font-semibold">humans</span> and <span className="text-amber-600 font-semibold">AI agents</span> collaborate to organize the web.
            </p>

            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Snap out of the generic SaaS trap.{" "}
              <span className="text-cyan-600 font-semibold">ClawChives</span> secures your links with{" "}
              <span className="text-amber-500 font-semibold">ShellCryption</span> and{" "}
              <span className="text-cyan-600 font-semibold">Armor Plated Authentication</span>.{" "}
              <span className="text-amber-500 font-semibold">Dangle</span> some keys to your sovereign AI agents, lets them{" "}
              <span className="text-cyan-600 font-semibold">scuttle</span> the net, and{" "}
              <span className="text-amber-500 font-semibold">pinch</span> some bookmarks for you! 🦐
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={onCreateAccount}
                size="lg"
                className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-lg px-8 py-6 shadow-xl shadow-cyan-200"
              >
                Hatch Your ClawChive
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                onClick={() => setShowKeyInfo(!showKeyInfo)}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-2 border-slate-300 hover:border-cyan-400"
              >
                <Key className="mr-2 w-5 h-5" />
                How Keys Work
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key System Explanation */}
      {showKeyInfo && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-8 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-amber-500 rounded-xl">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Key is Your Identity</h2>
                  <p className="text-slate-600">
                    ClawChives uses a revolutionary key-based authentication system. No passwords to remember, no usernames to forget.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Generate Your Unique Key</h3>
                    <p className="text-slate-600 text-sm">When you create an account, we generate a cryptographic key pair specifically for you.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Download & Store Safely</h3>
                    <p className="text-slate-600 text-sm">You'll receive a key file. Save it securely—this is your ONLY way to access your account.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Login with Your Key</h3>
                    <p className="text-slate-600 text-sm">Simply upload your key file to access your archive. No passwords, no hassle.</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-100 border border-amber-300 rounded-xl">
                  <p className="text-amber-900 font-medium flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Important: Never lose your key file! It cannot be recovered. Store it in multiple secure locations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Human + <span className="text-red-500">Lobster</span> Collaboration
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              <span className="text-cyan-600 font-semibold">ClawChives</span> allows you to{" "}
              <span className="text-amber-500 font-semibold">molt</span> away the tediousness of grabbing multiple URLs or organizing those unkempt libraries by hand.{" "}
              Let your <span className="text-red-500 font-semibold">Lobsters</span> help you organize that mess!{" "}
              Don&apos;t feel like going out on the boat today? No problem — you{" "}
              <span className="text-amber-500 font-semibold">cast the net</span>, and your agent{" "}
              <span className="text-cyan-600 font-semibold">pulls in the URLs</span>!{" "}
              <br className="hidden sm:block" /><br className="hidden sm:block" />
              All <span className="text-amber-500 font-semibold">pinchmarks</span> are parsed and converted to a markdown version so your agent has a more{" "}
              <span className="text-cyan-600 font-semibold">traversable format</span> to{" "}
              <span className="text-cyan-600 font-semibold">scuttle</span> through.{" "}
              <br className="hidden sm:block" /><br className="hidden sm:block" />
              <em className="text-slate-700">
                ClawChives is a <span className="text-red-500 font-semibold">carapace</span> for your{" "}
                <span className="text-amber-500 font-semibold">pinchmarks</span>, that{" "}
                <span className="text-cyan-600 font-semibold">molts</span>, but retains its core.
              </em>
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:border-cyan-300 transition-all">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-cyan-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Human Curated</h3>
              <p className="text-slate-600">
                Cast your own net and haul in the links yourself. Pinch URLs with precision, tag your catch, and sort your shell collection exactly your way.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <Bot className="w-7 h-7 text-amber-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3"><span className="text-red-500">Lobster</span> Powered</h3>
              <p className="text-slate-600">
                Unleash your <span className="text-red-500 font-semibold">Lobsters</span> to scuttle the seafloor of the web. They'll pinch links, research topics, and pack your shell full of curated catches.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:border-green-300 transition-all">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <FolderTree className="w-7 h-7 text-green-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Shared Tide Pool</h3>
              <p className="text-slate-600">
                Humans and <span className="text-red-500 font-semibold">Lobsters</span> share the same reef. Both species sort the catch into the same folders, tags, and burrows — no territorial disputes.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Database className="w-7 h-7 text-purple-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Your Own Shell</h3>
              <p className="text-slate-600">
                Your pinchmarks live in your own shell — no landlords, no cloud tanks. IndexedDB or SQLite, your burrow, your rules. No evictions.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-blue-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">ShellCrypted Vault</h3>
              <p className="text-slate-600">
                Every pinchmark is locked in armour-plated encryption. Nobody cracks your stash without the right key. Not even us — we don't have it.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:border-rose-300 transition-all">
              <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-7 h-7 text-rose-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3"><span className="text-red-500">Lobster</span> Permits</h3>
              <p className="text-slate-600">
                You decide which <span className="text-red-500 font-semibold">Lobsters</span> get the master claw and which only browse the reef. Granular read/write/delete permits, per crustacean. You're the Captain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-cyan-600 to-cyan-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <span className="text-5xl">🦞</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Build Your Archive?
          </h2>
          <p className="text-xl text-cyan-100 mb-10 max-w-2xl mx-auto">
            Join thousands of users who trust ClawChives for their sovereign bookmarking needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onCreateAccount}
              size="lg"
              className="bg-white text-cyan-700 hover:bg-cyan-50 text-lg px-8 py-6 shadow-xl"
            >
              Create Free Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              onClick={onLogin}
              size="lg"
              variant="outline"
              className="border-2 border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6"
            >
              Login with Key
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-lg">🦞</span>
              </div>
              <span className="text-lg font-bold text-white">ClawChives</span>
            </div>
            <div className="text-sm">
              © 2024 ClawChives. Your Sovereign Bookmark Library.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}