"use client";

import { MapPin, Phone, Mail, MessageCircle, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="animate-fade-in">
      <section className="bg-surface-muted/50 border-b border-border-light">
        <div className="container-shop py-10 md:py-16 text-center">
          <h1 className="text-2xl md:text-4xl font-serif text-foreground mb-4">Contact Us</h1>
          <p className="text-sm md:text-base text-text-secondary max-w-lg mx-auto">
            We&apos;d love to hear from you. Reach out with any questions.
          </p>
        </div>
      </section>

      <section className="container-shop py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-serif">Get in Touch</h2>
            <div className="space-y-4">
              <a href="tel:+919895071144" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border-light hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Phone size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-xs text-text-muted">+91 99999 99999</p>
                </div>
              </a>
              <a href="mailto:info@westhomebybmd.com" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border-light hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Mail size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-xs text-text-muted">info@westhomebybmd.com</p>
                </div>
              </a>
              <a href="https://wa.me/919895071144" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border-light hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                  <MessageCircle size={18} className="text-[#25D366]" />
                </div>
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-xs text-text-muted">Chat with us</p>
                </div>
              </a>
              <div id="location" className="flex items-start gap-3 p-3 bg-white rounded-xl border border-border-light">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <MapPin size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium">Store Location</p>
                  <p className="text-xs text-text-muted">India</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-xl font-serif mb-4">Send a Message</h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Thank you! We'll get back to you soon."); }}>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Name</label>
                <input type="text" required className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Email</label>
                <input type="email" required className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Message</label>
                <textarea required rows={4} className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>
              <button type="submit" className="w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
