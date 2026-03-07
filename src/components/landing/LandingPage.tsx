import { useState } from "react";
import { Button } from "../ui/button";
import { Shield, Database, Users, Bot, Lock, Key, ArrowRight, Zap, Globe, FolderTree, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../theme-provider";

interface LandingPageProps {
  onCreateAccount: () => void;
  onLogin: () => void;
}

export function LandingPage({ onCreateAccount, onLogin }: LandingPageProps) {
  const [showKeyInfo, setShowKeyInfo] = useState(false);
  const [gatewayMode, setGatewayMode] = useState<"human" | "agent">("human");
  const [agentTab, setAgentTab] = useState<"botkit" | "manual">("botkit");
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Navigation */}
      <nav className="border-b-2 border-red-500 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-red-900/20">
                <span className="text-2xl">🦞</span>
              </div>
              <span className="text-xl font-bold mr-4">
                <span className="text-cyan-600">Claw</span>
                <span className="text-red-600 dark:text-red-500">Chives</span>
              </span>
              
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={(e) => setTheme("light", e.clientX, e.clientY)}
                  className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  title="Light Mode"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => setTheme("dark", e.clientX, e.clientY)}
                  className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-slate-700 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  title="Dark Mode"
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => setTheme("auto", e.clientX, e.clientY)}
                  className={`p-1.5 rounded-full transition-all ${theme === 'auto' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  title="System Theme"
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={onLogin} 
                className="bg-amber-500 hover:bg-amber-600 text-white dark:text-slate-900 font-medium shadow-sm"
              >
                Login
              </Button>
              <Button 
                onClick={onCreateAccount}
                className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/20"
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
              src="/assets/main-logo.png"
              alt="ClawChives Logo"
              className="w-72 h-72 object-contain mx-auto -mb-12 mix-blend-multiply dark:mix-blend-screen dark:invert brightness-[1.1] contrast-[1.1]"
            />

            <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Local-First Sovereign Pinchmarking
            </div>

            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              <span className="text-red-500">Claw</span>
              <span className="text-cyan-600">Chives</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Your sovereign <span className="text-red-500 font-semibold">pinchmark</span> library where <span className="text-cyan-700 font-semibold">Humans</span> and <span className="text-red-500 font-semibold">AI Lobsters</span> collaborate to <span className="text-red-500 font-semibold">scuttle</span> the web.
            </p>

            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
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
                className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-lg px-8 py-6 shadow-xl shadow-cyan-200 dark:shadow-cyan-600/40"
              >
                Hatch Your ClawChive
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                onClick={() => setShowKeyInfo(!showKeyInfo)}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-2 border-slate-300 dark:border-slate-700 hover:border-cyan-400 dark:text-white"
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
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-8 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-amber-500 rounded-xl">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Your Key is Your Identity</h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    ClawChives uses a new key-based lobthentication system. No passwords to remember, no usernames to forget.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50">Generate Your Unique Key</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">When you create an account, we generate a cryptographic key pair specifically for you.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50">Download & Store Safely</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">You'll receive a key file. Save it securely—this is your ONLY way to access your account.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50">Login with Your Key</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Simply upload your key file to access your clawchive. No passwords, no hassle.</p>
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

      {/* Authentication Gateway */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-full backdrop-blur-sm">
            <button 
              onClick={() => setGatewayMode("human")}
              className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-full transition-all uppercase tracking-widest ${gatewayMode === "human" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              👤 I'm a Human
            </button>
            <button 
              onClick={() => setGatewayMode("agent")}
              className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-full transition-all uppercase tracking-widest ${gatewayMode === "agent" ? "bg-amber-500 text-white shadow-lg shadow-amber-900/20" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              🤖 I'm an Agent
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
            {gatewayMode === "human" ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <h3 className="text-slate-900 dark:text-white font-bold mb-6 text-center text-xs uppercase tracking-widest leading-relaxed">
                  Join the <br /> <span className="text-cyan-600">Reef</span> 🌊
                </h3>
                <div className="text-sm text-slate-500 dark:text-slate-400 space-y-4 px-1">
                  <p className="flex items-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-md font-black mr-3 text-xs flex-shrink-0">1</span> 
                    Generate your unguessable Identity Key
                  </p>
                  <p className="flex items-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-md font-black mr-3 text-xs flex-shrink-0">2</span> 
                    Store it somewhere safe (Offline)
                  </p>
                  <p className="flex items-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-md font-black mr-3 text-xs flex-shrink-0">3</span> 
                    Drag & Drop to authenticate anywhere
                  </p>
                </div>
                <Button 
                  onClick={onCreateAccount}
                  className="w-full mt-8 bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20"
                >
                  Create Human Identity
                </Button>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in duration-300">
                <h3 className="text-slate-900 dark:text-white font-bold mb-6 text-center text-xs uppercase tracking-widest leading-relaxed">
                  Integrate your <br /> <span className="text-amber-500">Lobsters</span> 🦞
                </h3>
                
                <div className="flex mb-6 bg-slate-100 dark:bg-slate-950 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={() => setAgentTab("botkit")}
                    className={`flex-1 px-3 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest ${agentTab === "botkit" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                  >
                    BotKit
                  </button>
                  <button 
                    onClick={() => setAgentTab("manual")}
                    className={`flex-1 px-3 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest ${agentTab === "manual" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                  >
                    Manual
                  </button>
                </div>

                {agentTab === "botkit" ? (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center group relative overflow-hidden">
                      <code className="text-amber-600 dark:text-amber-400 text-xs font-mono break-all leading-relaxed text-center relative z-10 selection:bg-amber-200 dark:selection:bg-amber-900/50">
                        npx clawchives-botkit init
                      </code>
                      <div className="absolute inset-0 bg-amber-50 dark:bg-amber-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-3 px-1">
                      <p className="flex items-center">
                        <span className="w-5 h-5 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md font-black mr-3 text-[10px] flex-shrink-0">1</span> 
                        Initialize the BotKit Toolkit in your project
                      </p>
                      <p className="flex items-center">
                        <span className="w-5 h-5 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md font-black mr-3 text-[10px] flex-shrink-0">2</span> 
                        Generate Key natively inside ClawChives Settings
                      </p>
                      <p className="flex items-center">
                        <span className="w-5 h-5 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md font-black mr-3 text-[10px] flex-shrink-0">3</span> 
                        Assign granular permissions to limit blast radius
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center">
                      <code className="text-amber-600 dark:text-amber-400 text-[10px] font-mono whitespace-pre text-left leading-relaxed">
{`POST /api/auth/token
{
  "type": "agent",
  "keyHash": "<SHA-256>"
}`}
                      </code>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-3 px-1">
                      <p className="flex items-center">
                        <span className="w-5 h-5 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md font-black mr-3 text-[10px] flex-shrink-0">1</span> 
                        Manually create a key via settings 
                      </p>
                      <p className="flex items-center">
                        <span className="w-5 h-5 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md font-black mr-3 text-[10px] flex-shrink-0">2</span> 
                        Exchange hashed <code className="mx-1 px-1 bg-slate-200 dark:bg-slate-800 rounded">lb-</code> key for API token
                      </p>
                      <p className="flex items-center">
                        <span className="w-5 h-5 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md font-black mr-3 text-[10px] flex-shrink-0">3</span> 
                        Pass <code className="mx-1 px-1 bg-slate-200 dark:bg-slate-800 rounded">Bearer</code> token in Authorization header
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Human + <span className="text-red-500">Lobster</span> Collaboration
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
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
              <em className="text-slate-700 dark:text-slate-300">
                ClawChives is a <span className="text-red-500 font-semibold">carapace</span> for your{" "}
                <span className="text-amber-500 font-semibold">pinchmarks</span>, that{" "}
                <span className="text-cyan-600 font-semibold">molts</span>, but retains its core.
              </em>
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-cyan-300 transition-all">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-cyan-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3">Human Curated</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Cast your own net and haul in the links yourself. Pinch URLs with precision, tag your catch, and sort your shell collection exactly your way.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-amber-300 transition-all">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <Bot className="w-7 h-7 text-amber-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3"><span className="text-red-500">Lobster</span> Powered</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Unleash your <span className="text-red-500 font-semibold">Lobsters</span> to scuttle the seafloor of the web. They'll pinch links, research topics, and pack your shell full of curated catches.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-green-300 transition-all">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <FolderTree className="w-7 h-7 text-green-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3">Shared Tide Pool</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Humans and <span className="text-red-500 font-semibold">Lobsters</span> share the same reef. Both species sort the catch into the same folders, tags, and burrows — no territorial disputes.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-purple-300 transition-all">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Database className="w-7 h-7 text-purple-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3">Your Own Shell</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Your pinchmarks live in your own shell — no landlords, no cloud tanks. IndexedDB or SQLite, your burrow, your rules. No evictions.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-blue-300 transition-all">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-blue-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3">ShellCrypted Vault</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Every pinchmark is locked in armour-plated encryption. Nobody cracks your stash without the right key. Not even us — we don't have it.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-rose-300 transition-all">
              <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-7 h-7 text-rose-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3"><span className="text-red-500">Lobster</span> Permits</h3>
              <p className="text-slate-600 dark:text-slate-400">
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
            Ready to Build Your ClawChive?
          </h2>
          <p className="text-xl text-cyan-100 mb-10 max-w-2xl mx-auto">
            Join the Reef, Let your <span className="text-red-500 font-semibold">Lobsters</span> help keep your <span className="text-amber-500 font-semibold">tacklebox</span> organized and streamlined.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onCreateAccount}
              size="lg"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-lg px-8 py-6 shadow-xl shadow-red-900/20"
            >
              Hatch Your ClawChive
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              onClick={onLogin}
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-white dark:text-slate-900 font-medium text-lg px-8 py-6 shadow-xl shadow-amber-900/20"
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
              <span className="text-lg font-bold">
                <span className="text-cyan-400">Claw</span>
                <span className="text-red-500">Chives</span>
              </span>
            </div>
            <div className="text-sm">
              © 2026 ClawChives. Your Sovereign <span className="text-red-500 font-semibold">Pinchmark</span> Library.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}