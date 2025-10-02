import { Bell, Calendar, Clock, Heart } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Receive timely alerts for appointments, medication, and important events"
  },
  {
    icon: Calendar,
    title: "Event Reminders",
    description: "Never miss family gatherings, check-ups, or special occasions"
  },
  {
    icon: Clock,
    title: "Daily Routines",
    description: "Get gentle reminders for meals, exercise, and daily activities"
  },
  {
    icon: Heart,
    title: "Wellness Checks",
    description: "Stay connected with regular health and wellness notifications"
  }
];

const NotificationsSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-secondary/30 to-background">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Stay Connected</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Notifications & Reminders
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            ElderEase keeps both seniors and volunteers informed with personalized notifications 
            and gentle reminders, ensuring no important moment is missed.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-primary/10 hover:border-primary/30 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 max-w-4xl mx-auto bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                For Elderly & Volunteers
              </h3>
              <p className="text-muted-foreground">
                Customizable notification preferences ensure everyone receives the right information at the right time.
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NotificationsSection;
