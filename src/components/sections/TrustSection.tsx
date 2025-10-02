import { Button } from "@/components/ui/button";
import trustImage from "@/assets/trust-image.png";
import { motion } from "framer-motion";

const TrustSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="bg-primary-dark text-primary-dark-foreground rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="grid md:grid-cols-2 gap-0">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-12 flex flex-col justify-center"
            >
              <Button variant="secondary" size="sm" className="w-fit mb-6 rounded-full">
                Manage your Schedule
              </Button>
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Trust us to be there to help and make things well again.
              </h2>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-full min-h-[400px]"
            >
              <img 
                src={trustImage} 
                alt="Care provider with senior" 
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
