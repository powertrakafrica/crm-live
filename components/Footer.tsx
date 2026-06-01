import Link from "next/link";
import { Home, MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="inline-block">
                            <span className="text-2xl font-heading font-bold text-white">TEPS</span>
                        </Link>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            The estate platform you can trust. Verified properties across Ghana with zero scams.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <a href="#" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-brand-600 hover:text-white transition-colors">
                                <Facebook className="h-4 w-4" />
                            </a>
                            <a href="#" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-brand-600 hover:text-white transition-colors">
                                <Twitter className="h-4 w-4" />
                            </a>
                            <a href="#" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-brand-600 hover:text-white transition-colors">
                                <Instagram className="h-4 w-4" />
                            </a>
                            <a href="#" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-brand-600 hover:text-white transition-colors">
                                <Linkedin className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h3>
                        <ul className="space-y-2.5">
                            <li>
                                <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                                    <Home className="h-3.5 w-3.5" /> Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/properties" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5" /> Properties
                                </Link>
                            </li>
                            <li>
                                <Link href="/auth/signup" className="text-sm text-slate-400 hover:text-white transition-colors">List Property</Link>
                            </li>
                            <li>
                                <Link href="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign In</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Resources</h3>
                        <ul className="space-y-2.5">
                            <li><Link href="#" className="text-sm text-slate-400 hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="#" className="text-sm text-slate-400 hover:text-white transition-colors">How It Works</Link></li>
                            <li><Link href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Verification Process</Link></li>
                            <li><Link href="#" className="text-sm text-slate-400 hover:text-white transition-colors">FAQs</Link></li>
                            <li><Link href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-400">Accra, Greater Accra, Ghana</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                                <span className="text-sm text-slate-400">+233 20 000 0000</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                                <span className="text-sm text-slate-400">hello@teps.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                        &copy; {new Date().getFullYear()} TEPS. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Terms</Link>
                        <Link href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Privacy</Link>
                        <Link href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
